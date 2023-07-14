const { google } = require("googleapis");
const fnMap = {
    "Linguistic Meaning": parseLinguistics,
    "Variant Readings": parseVariantReadings,
    "Existing Commentary": parseExistingCommentary,
    "Comments/Reflections": parseComments,
    "Connection with other ayat": parseConnections
};

const headings = ["Linguistic Meaning", "Variant Readings", "Existing Commentary", "Comments/Reflections", "Connection with other ayat"];

async function getDocument(documentId) {
    const auth = new google.auth.GoogleAuth({
        keyFile: "credentials.json",
        scopes: "https://www.googleapis.com/auth/documents",
    });
    const client = await auth.getClient();
    const googleDocs = google.docs({ version: "v1", auth: client });

    const docmetadata = await googleDocs.documents.get({
        auth,
        documentId,
    });

    // Add new_section index extracted_data
    return docmetadata.data;
}

// Our main funciton that executes parsing of an entire document
async function parseDocument(documentId) {
    const auth = new google.auth.GoogleAuth({
        keyFile: "credentials.json",
        scopes: "https://www.googleapis.com/auth/documents",
    });
    const client = await auth.getClient();
    const googleDocs = google.docs({ version: "v1", auth: client });

    const docmetadata = await googleDocs.documents.get({
        auth,
        documentId,
    });

    // Add new_section index extracted_data
    let document = docmetadata.data;

    // TODO - implement parsing intro (ignoring intro for now)
    // let intro = parseIntro(document);

    let indices = getVerseIndicesTableFormat(document);

    let v_gen = verseGenerator(document, indices);
    let parsed = {
        chapter: Object.keys(indices)[0].split(":")[0],
        verses: {},
        // intro: intro,
    };
    let verse;
    let done;
    while (!done) {
        // The verse generator will take care of the iteration for us.
        ({ value: verse, done } = v_gen.next());
        !done ? (parsed.verses[verse.number] = verse) : null;
    }
    return parsed;
}

/**
 * Get all of the text in between two indices.
 *
 * @param {int} start
 * @param {int} end
 * @param {Object} content, basically whole document
 * @returns text array which contains all the text in between start and end
 */
function getTextInBetween(start, end, content) {
    let text = [];
    for (var i = start; i <= end; i++) {
        text.push(content[i].paragraph);
    }
    return text;
}

/**
 *  A generator function that helps us parse a single verse when called.
 * 
 *  @param {Object} document
 *  @param {Object} verses
 */
function* verseGenerator(document, verses) {
    let verse_ids = Object.keys(verses);
    let verse;
    for (let v = 0; v < verse_ids.length; v++) {
        verse = {};
        verse_location = verses[verse_ids[v]]; // get the index of the verse in the request body
        console.log("Verse Location: ", verse_location);
        verse.number = v + 1;
        verse.body_index = verses[verse_ids[v]];
        verse.linguistics = {};
        verse.variantReadings = {};
        verse.existingCommentary = {};
        verse.comments = {};
        verse.connections = {};
        parseVerse(document, verse, verse_location + 1);
        console.log(verse);

        yield verse;
    }
}

/**
 * A function that focuses on parsing all the sections of the current verse
 *
 * @param {Object} document
 * @param {Object} verse
 * @param {int} verse_loc
 */
function parseVerse(document, verse, verse_loc) {
    let index = verse_loc;
    let content = document.body.content;
    let line = content[verse_loc];

    while (index < content.length && !(line?.table && line.table.tableRows[0].tableCells[0].tableCellStyle?.backgroundColor?.color?.rgbColor?.green > 0.9)) {
        line = content[index];

        // start of a verse section
        if (line?.paragraph?.elements[0]?.textRun?.textStyle?.underline) {
            let verse_header = line?.paragraph?.elements[0].textRun.content.split(":")[0];
            if (headings.includes(verse_header)) index = fnMap[verse_header](document, verse, index);
        }

        index++;
    }
}

// TODO - this feels very repeated (follow DRY principle)

/**
 * A function that focuses on parsing the linguistics of a verse
 *
 * @param {Object} document
 * @param {int} index
 * @returns text array which contains all the text in between start and end of linguistic meaning section
 */
function parseLinguistics(document, verse, index) {
    let content = document.body.content;

    // get the current start and end of the Linguistic Meaning section
    // based on index
    const [start_index, end_index] = getVerseSectionStartAndEnd(index, content);

    // return the text between the start and end indices (JSON)
    verse.linguistics = getTextInBetween(start_index, end_index, content);

    return end_index;
}

/**
 * A function that focuses on parsing the variant readings of a verse
 *
 * @param {Object} document
 * @param {int} index
 * @returns text array which contains all the text in between start and end of linguistic meaning section
 */
function parseVariantReadings(document, verse, index) {
    let content = document.body.content;

    // get the current start and end of the Variant Readings section
    // based on index
    const [start_index, end_index] = getVerseSectionStartAndEnd(index, content);

    // return the text between the start and end indices (JSON)
    verse.variantReadings = getTextInBetween(start_index, end_index, content);

    return end_index;
}

/**
 * A function that focuses on parsing the existing commentary of a verse
 *
 * @param {Object} document
 * @param {int} index
 * @returns text array which contains all the text in between start and end of linguistic meaning section
 */
function parseExistingCommentary(document, verse, index) {
    let content = document.body.content;

    // get the current start and end of the existing commentary section
    // based on index
    const [start_index, end_index] = getVerseSectionStartAndEnd(index, content);

    // return the text between the start and end indices (JSON)
    verse.existingCommentary = getTextInBetween(start_index, end_index, content);

    return end_index;
}

/**
 * A function that focuses on parsing the comments/reflections of a verse
 *
 * @param {Object} document
 * @param {int} index
 * @returns text array which contains all the text in between start and end of linguistic meaning section
 */
function parseComments(document, verse, index) {
    let content = document.body.content;

    // get the current start and end of the comments/reflections section
    // based on index
    const [start_index, end_index] = getVerseSectionStartAndEnd(index, content);

    // return the text between the start and end indices (JSON)
    verse.comments = getTextInBetween(start_index, end_index, content);

    return end_index;
}

/**
 * A function that focuses on parsing the connections (with other ayat) of a verse
 *
 * @param {Object} document
 * @param {int} index
 * @returns text array which contains all the text in between start and end of linguistic meaning section
 */
function parseConnections(document, verse, index) {
    let content = document.body.content;

    // get the current start and end of the connections with other ayat section
    // based on index
    const [start_index, end_index] = getVerseSectionStartAndEnd(index, content);

    // return the text between the start and end indices (JSON)
    verse.connections = getTextInBetween(start_index, end_index, content);

    return end_index;
}

/**
 * A function that focuses on finding the start and end of a verse section
 *
 * @param {Object} content
 * @returns an array which contains the start index and end index of the verse section in the document
 */
function getVerseSectionStartAndEnd(verse_loc, content) {
    var start_index;
    var end_index;
    var found_start = false;

    var line_index;

    for (line_index = verse_loc; line_index < content.length; line_index++) {
        let line = content[line_index];

        // if the current text is underlined then it marks the
        // header/start of the current verse section
        if (line?.paragraph?.elements[0]?.textRun?.textStyle?.underline || (line?.table && line.table.tableRows[0].tableCells[0].tableCellStyle?.backgroundColor?.color?.rgbColor?.green > 0.9)) {
            if (!found_start) {
                start_index = line_index + 1;
                found_start = true;
            }

            else {
                break;
            }
        }
    }

    end_index = line_index - 1;

    return [start_index, end_index];

}

/**
 *  Fetch the indices of each verse within the body of a document.
 *  This specifically applies to the green boxes where the indices are located in the new notes.
 *
 *  @param {*} document
 *  @returns an array of key value pairs (chapter:verse): index
 */

// ex: 85:1
function getVerseIndicesTableFormat(document) {
    let content = document.body.content;
    let verses = {};
    let verse;
    content.forEach((line, line_index) => {
        // Checks if the current line contains a green table.
        // For context, the green tables are the ones that contain
        // verse indices
        if (line?.table && line.table.tableRows[0].tableCells[0].tableCellStyle?.backgroundColor?.color?.rgbColor?.green > 0.9) {
            verse = line.table.tableRows[0].tableCells[0].content[0].paragraph.elements[0].textRun.content.trim();
            verses[verse] = line_index;
            console.log("Got verse index: ", verses[verse]);
        }
    });
    console.log(verses);
    return verses;
}

/**
 * A function that focuses on parsing the intro section of the notes
 *
 * @param {Object} document
 * @returns intro_sections, which is an object that contains all of the introduction sections.
 */
function parseIntro(document) {
    let content = document.body.content;
    let introStart = findIntroStart(content);
    let sections = findIntroSections(content);
    // Now that we have found the actual sections, all that remains is to parse the space in between the sections.
    sections.forEach((section) => {
        section.text = getTextInBetween(
            section.start_index + 1,
            section.end_index,
            content
        );
    });
    let intro = { start: introStart, sections };
    return intro;
}

/**
 * A function that focuses on parsing the intro section of the notes
 *
 * @param {Object} document
 * @returns intro_sections, which is an object that contains all of the introduction sections.
 */
function findIntroSections(content) {
    sections = [];
    for (var line_index = 0; line_index < content.length; line_index++) {
        // Find the start of the intro
        line = content[line_index];
        let style = line?.paragraph?.paragraphStyle;
        let elements = line?.paragraph?.elements;
        if (style && elements) {
            // This is where we check for the center alignment and bold text
            for (e = 0; e < elements.length; e++) {
                if (elements[e]?.horizontalRule) {
                    console.log("Found the end of the intro");
                    if (sections.length > 0) {
                        sections[sections.length - 1].end_index = line_index;
                    }
                    return sections;
                }
            }

            // found an intro section
            if (style.alignment == "CENTER") {
                elements.forEach((e) => {
                    let textStyle = e?.textRun?.textStyle;
                    console.log(textStyle);
                    if (
                        textStyle &&
                        textStyle.fontSize.magnitude == 16 &&
                        textStyle.weightedFontFamily.fontFamily == "Montserrat"
                    ) {
                        console.log("We found an intro section", line_index);
                        if (sections.length > 0) {
                            sections[sections.length - 1].end_index =
                                line_index;
                        }
                        sections.push({
                            title: e.textRun.content,
                            start_index: line_index,
                        });
                    }
                });
            }
        }
    }
    return sections;
}

/**
 * A function that focuses on finding the beginning of the intro section
 *
 * @param {Object} content
 * @returns line_index, where the title "INTRODUCTION" is found
 */
function findIntroStart(content) {
    let foundIntro = false;

    for (
        var line_index = 0;
        line_index < content.length && !foundIntro;
        line_index++
    ) {
        // Find the start of the intro
        line = content[line_index];
        let elements = line?.paragraph?.elements;

        // returns the index of the line where
        // the word "INTRODUCTION" is found
        if (elements) {
            // This is where we look for the title "INTRODUCTION"
            elements.forEach((e) => {
                if (e?.textRun?.content?.includes("INTRODUCTION")) {
                    console.log("We found the intro", line_index);
                    introStart = line_index;
                    foundIntro = true;
                }
            });
        }
    }
    return introStart;
}

// Feel free to add any helper functions below this comment but above the module exports.

module.exports = { parseDocument, getDocument };
