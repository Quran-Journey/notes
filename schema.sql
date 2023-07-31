DROP TABLE IF EXISTS Surah CASCADE;

CREATE TABLE
    IF NOT EXISTS Surah (
        surah_id SERIAL PRIMARY KEY,
        surah_number INTEGER NOT NULL,
        name_complex VARCHAR(50),
        name_arabic VARCHAR(50)
    );

DROP TABLE IF EXISTS SurahInfo CASCADE;

CREATE TABLE
    IF NOT EXISTS SurahInfo (
        surah_info_id SERIAL PRIMARY KEY,
        surah INTEGER NOT NULL,
        title VARCHAR(255) NOT NULL,
        info TEXT NOT NULL,
        FOREIGN KEY (surah) REFERENCES Surah(surah_id) ON DELETE CASCADE ON UPDATE CASCADE
    );

DROP TABLE IF EXISTS Verse CASCADE;

CREATE TABLE
    IF NOT EXISTS Verse (
        verse_index INTEGER PRIMARY KEY,
        surah INTEGER NOT NULL,
        verse_number INTEGER NOT NULL,
        verse_text Text NOT NULL,
        FOREIGN KEY (surah) REFERENCES Surah(surah_id) ON DELETE CASCADE ON UPDATE CASCADE
    );

DROP TABLE IF EXISTS Lesson CASCADE;

CREATE TABLE
    IF NOT EXISTS Lesson (
        lesson_id SERIAL PRIMARY KEY,
        lesson_date DATE NOT NULL,
        start_verse INTEGER,
        end_verse INTEGER,
        source TEXT NOT NULL,
        surah_id INTEGER,
        FOREIGN KEY (surah_id) REFERENCES Surah(surah_id) ON DELETE CASCADE ON UPDATE CASCADE
    );

DROP TABLE IF EXISTS Reflection CASCADE;

CREATE TABLE
    IF NOT EXISTS Reflection (
        reflection_id SERIAL PRIMARY KEY,
        verse_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        reflection TEXT,
        FOREIGN KEY (verse_id) REFERENCES Verse(verse_index) ON DELETE CASCADE ON UPDATE CASCADE
    );

DROP TABLE IF EXISTS RootWord CASCADE;

CREATE TABLE
    IF NOT EXISTS RootWord (
        root_id SERIAL PRIMARY KEY,
        root_word VARCHAR(225) NOT NULL UNIQUE
    );

DROP TABLE IF EXISTS ArabicWord CASCADE;

CREATE TABLE
    IF NOT EXISTS ArabicWord (
        word_id SERIAL PRIMARY KEY,
        word VARCHAR(255) NOT NULL,
        root_id INT NOT NULL,
        FOREIGN KEY (root_id) REFERENCES RootWord(root_id) ON DELETE CASCADE ON UPDATE CASCADE
    );

DROP TABLE IF EXISTS VerseWord CASCADE;

CREATE TABLE
    IF NOT EXISTS VerseWord (
        verse_word_id SERIAL PRIMARY KEY,
        verse_id INTEGER NOT NULL,
        word_id INTEGER NOT NULL,
        visible BOOLEAN DEFAULT true,
        word_explanation TEXT,
        -- This is the contextual explanation that we will give.
        FOREIGN KEY (verse_id) REFERENCES Verse(verse_index) ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY (word_id) REFERENCES ArabicWord(word_id) ON DELETE CASCADE ON UPDATE CASCADE
    );

DROP TABLE IF EXISTS RootMeaning CASCADE;

CREATE TABLE
    IF NOT EXISTS RootMeaning (
        meaning_id SERIAL PRIMARY KEY,
        root_id INTEGER NOT NULL,
        meaning TEXT,
        FOREIGN KEY (root_id) REFERENCES RootWord(root_id) ON DELETE CASCADE ON UPDATE CASCADE
    );

DROP TABLE IF EXISTS Mufasir CASCADE;

CREATE TABLE
    IF NOT EXISTS Mufasir (
        mufasir_id SERIAL PRIMARY KEY,
        mufasir_name TEXT NOT NULL,
        death VARCHAR(30) NOT NULL
    );

DROP TABLE IF EXISTS Book CASCADE;

CREATE TABLE
    IF NOT EXISTS Book (
        book_id SERIAL PRIMARY KEY,
        author INTEGER NOT NULL,
        title TEXT NOT NULL,
        publication_year VARCHAR(30),
        FOREIGN KEY (author) REFERENCES Mufasir(mufasir_id) ON DELETE CASCADE ON UPDATE CASCADE
    );

DROP TABLE IF EXISTS Tafsir CASCADE;

CREATE TABLE
    IF NOT EXISTS Tafsir (
        tafsir_id SERIAL PRIMARY KEY,
        tafsir_text TEXT NOT NULL,
        book INTEGER NOT NULL,
        verse_id INTEGER NOT NULL,
        visible BOOLEAN NOT NULL,
        FOREIGN KEY (verse_id) REFERENCES Verse(verse_index) ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY (book) REFERENCES Book(book_id) ON DELETE CASCADE ON UPDATE CASCADE
    );

DROP TABLE IF EXISTS MufasirTafsir CASCADE;

CREATE TABLE
    IF NOT EXISTS MufasirTafsir (
        mufasir INT,
        tafsir INT,
        FOREIGN KEY (mufasir) REFERENCES Mufasir(mufasir_id) ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY (tafsir) REFERENCES Tafsir(tafsir_id) ON DELETE CASCADE ON UPDATE CASCADE
    );