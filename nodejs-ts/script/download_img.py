import fs from "node:fs";
const data = JSON.parse(fs.readFileSync('./emoji.json', 'utf8'));
console.log(data)
