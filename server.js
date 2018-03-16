const fs = require("fs");
const path = require("path");
const express = require("express");
const graphqlHTTP = require("express-graphql");
const { makeExecutableSchema } = require("graphql-tools");
const sqlite3 = require('sqlite3').verbose();
const { promisify, Promise } = require("bluebird");
const compression = require("compression");

const schemaFile = path.join(__dirname, "schema.graphql");
const typeDefs = fs.readFileSync(schemaFile, "utf-8");


const resolvers = {
    Query: {
        Rollators: (_, {}, context) => context.db.all('SELECT * FROM rollators', []),
        Rollator: (_, { id }, context) => context.db.get('SELECT * FROM rollators WHERE id = ?', [id]),
	RollatorByName: (_, { name }, context) => context.db.all('SELECT * FROM rollators WHERE name = ?', [id])
    },
    Rollator: {
        Records: (rollator, _, context) => context.db.all('SELECT * FROM records WHERE rollator_id = ?', [rollator.id]),
    },
    Mutation: {
        Record: (_, { value, RPM, timestamp, rollator_id }, context) => {
            if (!timestamp) {
                timestamp = new Date().getTime();
            }
            context.db.get('INSERT INTO records(value, rpm, timestamp, rollator_id) VALUES(?, ?, ?, ?)', [value, RPM, timestamp, rollator_id])
        },
        registerRollator: (_, { name }, context) => {
            let promise = new Promise((resolve, reject) => {
                context.db.run('INSERT INTO rollators(name) VALUES(?)', [name], function(err) {
                    context.db.get('SELECT * FROM rollators WHERE id = ?' , [this.lastID]).then((r) => {
                        resolve(r);
                    });
                });
            });
            return promise;
        }
    }
}

let db = new sqlite3.Database('db', (err) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }

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

            console.log("Database tables created");

            db.each("SELECT * FROM rollators", [], (err, row) => {
                console.log(row);
            });

            // sqlite does not return promises, so use promisify to patch it
            db.get = promisify(db.get);
            db.all = promisify(db.all);

            const schema = makeExecutableSchema({ typeDefs, resolvers });
        
            let app = express();

            app.use(compression());

            app.use('/graphql', graphqlHTTP({
                schema: schema,
                graphiql: true,
                context: { db: db },
                tracing: true
            }));

            app.listen(4000);
            console.log("Server running on port 4000");
        });
    });

});
