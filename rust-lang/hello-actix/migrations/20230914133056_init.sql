-- Add migration script here
CREATE TABLE todos (
    id SERIAL PRIMARY KEY,
    text TEXT NOT NULL ,
    complated BOOLEAN NOT NULL DEFAULT false
);
