SELECT
  u.id,
  u.name,
  COUNT(p.id) AS "postCount"
FROM
  "users" u
LEFT JOIN "posts" p
  ON u.id = p."authorId"
GROUP BY
  u.id,
  u.name
