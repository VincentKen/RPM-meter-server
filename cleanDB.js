const sqlite3 = require('sqlite3').verbose();

let db = new sqlite3.Database('db', (err) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    db.run("DROP TABLE IF EXISTS records", [], (err) => {
        if (err) console.error(err);
        db.run("DROP TABLE IF EXISTS rollators", [], (err) => {
            if (err) console.error(err);

            db.run(`CREATE TABLE IF NOT EXISTS rollators(
                id integer PRIMARY KEY,
                name text NOT NULL
            )`, [], (err, res) => {
                if (err) {
                    console.error(err);
                    process.exit(1);
                }
                db.run(`CREATE TABLE IF NOT EXISTS records(
                    id integer PRIMARY KEY,
                    value float NOT NULL,
		    rpm integer NOT NULL,
                    timestamp integer NOT NULL,
                    rollator_id integer NOT NULL,
                    FOREIGN KEY (rollator_id) REFERENCES rollators (id)
                    ON DELETE CASCADE ON UPDATE NO ACTION
                )`, [], (err, res) => {
                    if (err) {
                        console.error(err);
                        process.exit(1);
                    }
                });
            });
        });
    });
});
