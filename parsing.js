const { google } = require("googleapis");

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

    // ignoring intro for now
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
 * @returns text array wich contains all the text in between start and end
 */
function getTextInBetween(start, end, content) {
    let text = [];
    for (var i = start; i < end; i++) {
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
        verse.text = fetchVerse(verse_ids[v]);
        verse.linguistics = parseLinguistics(document, verse_location);
        verse.interpretations = parseInterpretations(document, verse_location);
        verse.comments = parseComments(document, verse_location);
        console.log(verse);

        // what is this??
        yield verse;
    }
}

/**
 * Fetch a verse by it's id from quran.com.
 *
 * @param {string} verse_id
 * @return a verse object that contains the arabic uthmani repr, transliteration... and?
 */

// Not done yet
function fetchVerse(verse_id) {
    let verse = {};
    return verse;
}

/**
 *  Fetch the indices of each verse within the body of a document.
 *
 *  @param {*} document
 *  @returns an array of key value pairs (chapter:verse): index
 */

// ex: 85:1
function getVerseIndices(document) {
    let new_format;
    let content = document.body.content;
    let verses = {};
    let verse;
    content.forEach((line, line_index) => {
        line?.paragraph?.elements.forEach((element) => {
            // what is the horizontal rule??
            if (element?.horizontalRule) {
                verse =
                    content[
                        line_index + 1
                    ].paragraph.elements[0].textRun.content.trim();
                verses[verse] = line_index;
            }
        });
    });
    console.log(verses);
    return verses;
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
    let new_format;
    let content = document.body.content;
    let verses = {};
    let verse;
    content.forEach((line, line_index) => {
        // checks if the current line contains a green table
        // for context, the green tables are the ones that contain
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

// What is the point of looping through
// all the lines again when you already found 
// the start of the intro
function findIntroSections(content) {
    sections = [];
    for (var line_index = 0; line_index < content.length; line_index++) {
        // Find the start of the intro
        line = content[line_index];
        let style = line?.paragraph?.paragraphStyle;
        let elements = line?.paragraph?.elements;
        if (style && elements) {
            // This is where we check for the center alignment and bold text

            // what does the end of the intro look like?
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

    // loops through content line by line
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
                console.log(e?.textRun);
                // what this looks like:

                /*
                {
                    content: 'INTRODUCTION\n',
                    textStyle: {
                        underline: true,
                        foregroundColor: { color: [Object] },
                        fontSize: { magnitude: 20, unit: 'PT' },
                        weightedFontFamily: { fontFamily: 'Times New Roman', weight: 400 }
                    }
                }
                */

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

/**
 * A function that focuses on parsing the linguistics of a verse
 *
 * @param {Object} document
 * @param {int} verse_loc
 * @returns text array wich contains all the text in between start and end of linguistic meaning section
 */

// Not done yet
function parseLinguistics(document, verse_loc) {
    // let lings = {};
    let content = document.body.content;

    let startIndex = getVerseSectionStart(verse_loc, content);
    let endIndex = getVerseSectionEnd(startIndex, content);

    return getTextInBetween(startIndex, endIndex, content);
}

/**
 * A function that focuses on finding the beginning of a verse section
 *
 * @param {Object} content
 * @returns line_index, which is the index where the current verse section begins
 */
function getVerseSectionStart(verse_loc, content) {

    var line_index;

    for (line_index = verse_loc; line_index < content.length; line_index++) {
        let line = content[line_index];

        if (line?.paragraph?.elements[0]?.textRun?.textStyle?.underline) {
            return line_index + 1;
        }
    }

}

/**
 * A function that focuses on finding the end of a verse section
 *
 * @param {Object} content
 * @returns line_index, which is the index where the current verse section ends
 */
function getVerseSectionEnd(verse_loc, content) {
    var line_index;

    for (line_index = verse_loc; line_index < content.length; line_index++) {
        let line = content[i];

        if (line?.paragraph?.elements[0]?.textRun?.textStyle?.underline) {
            return line_index - 1;
        }
    }

    // reached end of doc page
    return line_index - 1;
}

/**
 *  A function that focuses on parsing interpretations.
 *
 *  @param {Object} document
 *  @param {int} verse_loc
 *  @returns an object containing the interpretations of a verse
 */

// Not done yet
function parseInterpretations(document, verse_loc) {
    let interps = {};
    return interps;
}

/**
 *  A function that focuses on parsing comments.
 *
 *  @param {Object} document
 *  @param {int} verse_loc
 *  @returns an object containing the comments for a verse
 */

// Not done yet
function parseComments(document, verse_loc) {
    let comments = {};
    return comments;
}

// Feel free to add any helper functions below this comment but above the module exports.

module.exports = { parseDocument, getDocument };
