import chalk from "chalk";

const isTTY = process.stdout.isTTY;

const c = {
  keyword: chalk.cyanBright,
  function: chalk.magentaBright,
  string: chalk.green,
  number: chalk.yellow,
  operator: chalk.gray,
  table: chalk.blueBright,
  column: chalk.white,
};

export function highlightSql(sql: string): string {
  if (!isTTY) return sql;

  return (
    sql
      // Keywords
      .replace(
        /\b(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|INNER|LEFT|RIGHT|JOIN|ON|VALUES|SET|RETURNING|LIMIT|OFFSET|ORDER BY|GROUP BY|AND|OR|NOT|NULL|IS|IN)\b/gi,
        (m) => c.keyword(m.toUpperCase()),
      )
      // Functions
      .replace(/\b(COUNT|NOW|MAX|MIN|AVG|COALESCE)\b\s*\(/gi, (m) => c.function(m))
      // Strings
      .replace(/'([^']*)'/g, (m) => c.string(m))
      // Numbers
      .replace(/\b\d+(\.\d+)?\b/g, (m) => c.number(m))
      // Operators
      .replace(/(=|<>|!=|<=|>=|<|>)/g, (m) => c.operator(m))
  );
}
export function highlightMeta(log: string): string {
  if (!isTTY) return log;

  return log.replace(/(\d+ms)/g, (m) => chalk.greenBright.bold(m));
}
