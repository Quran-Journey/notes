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

    let intro = parseIntro(document);

    let indices = getVerseIndices(document);

    let v_gen = verseGenerator(document, indices);
    let parsed = {
        chapter: Object.keys(indices)[0].split(":")[0],
        verses: {},
        intro,
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
 * @param {*} content
 */
function getTextInBetween(start, end, content) {
    let text = [];
    for (var i = start; i < end; i++) {
        text.push(content[i].paragraph);
    }
    return text;
}

function findKeyWords(content, words, start_index) {
    let foundIntro = false;
    console.log("Start index: ", start_index);
    let introStart;
    for (
        let line_index = start_index;
        line_index < content.length && !foundIntro;
        line_index++
    ) {
        // Find the start of the intro
        let line = content[line_index];
        let elements = line?.paragraph?.elements;
        if (elements) {
            // This is where we look for the title "INTRODUCTION"
            elements.forEach((e) => {
                if (e?.textRun?.content.includes(words)) {
                    introStart = line_index;
                    foundIntro = true;
                }
            });
        }
    }
    return introStart;
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
        verse.number = v + 1;
        verse.body_index = verses[verse_ids[v]];
        verse.text = fetchVerse(verse_ids[v]);
        verse.linguistics = parseLinguistics(document, verse_location);
        verse.interpretations = parseInterpretations(document, verse_location);
        verse.comment = parseComment(document, verse_location);
        yield verse;
    }
}

/**
 * Fetch a verse by it's id from quran.com.
 *
 * @param {string} verse_id
 * @return a verse object that contains the arabic uthmani repr, transliteration... and?
 */
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
function getVerseIndices(document) {
    let new_format;
    let content = document.body.content;
    let verses = {};
    let verse;
    content.forEach((line, line_index) => {
        line?.paragraph?.elements.forEach((element) => {
            if (element?.horizontalRule) {
                verse =
                    content[
                        line_index + 1
                    ].paragraph.elements[0].textRun.content.trim();
                verses[verse] = line_index;
            }
        });
    });
    return verses;
}

/**
 * A function that focuses on parsing the linguistics of a verse
 *
 * @param {Object} document
 * @returns intro_sections, which is an object that contains all of the introduction sections.
 */
function parseIntro(document) {
    let content = document.body.content;
    let introStart = findKeyWords(content, "INTRODUCTION", 0);
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
 * Find all of the intro sections based on their font family and size.
 * @param {*} content
 * @returns all intro sections
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
                    if (sections.length > 0) {
                        sections[sections.length - 1].end_index = line_index;
                    }
                    return sections;
                }
            }
            if (style.alignment == "CENTER") {
                elements.forEach((e) => {
                    let textStyle = e?.textRun?.textStyle;
                    if (
                        textStyle &&
                        textStyle.fontSize.magnitude == 16 &&
                        textStyle.weightedFontFamily.fontFamily == "Montserrat"
                    ) {
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
 * A function that focuses on parsing the linguistics of a verse
 *
 * @param {Object} document
 * @param {int} verse_loc
 * @returns
 */
function parseLinguistics(document, verse_loc) {
    let lings = {};
    return lings;
}

/**
 *  A function that focuses on parsing interpretations.
 *
 *  @param {Object} document
 *  @param {int} verse_loc
 *  @returns an object containing the interpretations of a verse
 */
function parseInterpretations(document, verse_loc) {
    let interps = {};
    return interps;
}

/**
 * Find the index of the next verse so that we can parse everything between it.
 * This function might be redundant because we found all of the indices in the very beginning.
 *
 * @param {integer} current_location
 * @returns
 */
function findStartOfNextVerse(document, current_location) {
    for (
        var line_index = current_location;
        line_index < document.length;
        line_index++
    ) {
        line = content[line_index];
        let elements = line?.paragraph?.elements;
        for (e = 0; e < elements.length; e++) {
            if (elements[e]?.horizontalRule) {
                console.log("Found the start of the next verse");
                return line_index;
            }
        }
    }
}

/**
 *  A function that focuses on parsing comments.
 *
 *  @param {Object} document
 *  @param {int} verse_loc
 *  @returns an object containing the comments for a verse
 */
function parseComment(document, verse_loc) {
    let comment = {};
    let commentStart = findKeyWords(
        document.body.content,
        "QJ Commentary",
        verse_loc
    );
    console.log(verse_loc);
    if (commentStart) {
        comment.start_index = commentStart;
        comment.end = findStartOfNextVerse(document, verse_loc);
        comment.content = getTextInBetween(
            comment.start_index,
            comment.end,
            document
        );
    }
    return comment;
}

// Feel free to add any helper functions below this comment but above the module exports.

module.exports = { parseDocument, getDocument };
