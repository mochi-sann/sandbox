function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

function countOccurrences<T>(array: T[]): Record<T, number> {
  const counts: Record<T, number> = {} as Record<T, number>;

  array.forEach((item) => {
    counts[item] = (counts[item] || 0) + 1;
  });

  return counts;
}

function main() {
  // console.log(getRandomInt(6));

  let rdm_numbers: number[] = [];

  for (let index = 0; index < 600; index++) {
    const rdm_int = getRandomInt(6)
    rdm_numbers.push(rdm_int);
    if (rdm_int == 0) {

    }

  }
  const rdm_numbers_occ = countOccurrences(rdm_numbers);
  console.log(rdm_numbers_occ);

}

for (let index = 0; index < 10; index++) {
  main();

}
