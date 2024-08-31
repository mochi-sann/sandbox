function getRandomInt(max: number) {
  return Math.floor(Math.random() * max);
}

function countOccurrencesAndPercentages<T>(array: T[]): {
    counts: Record<T, number>,
    percentages: Record<T, number>
} {
    const counts: Record<T, number> = {} as Record<T, number>;
    const percentages: Record<T, number> = {} as Record<T, number>;

    array.forEach((item) => {
        counts[item] = (counts[item] || 0) + 1;
    });

    const total = array.length;

    for (const key in counts) {
        percentages[key] = (counts[key] / total) * 100;
    }

    return { counts, percentages };
}


const TOTAL = 10000000
const RANDOM_COUNT = 10
function main() {
  // console.log(getRandomInt(6));

  let rdm_numbers: number[] = [];

  for (let index = 0; index < TOTAL; index++) {
    const rdm_int = getRandomInt(RANDOM_COUNT)
    rdm_numbers.push(rdm_int);
    if (rdm_int == 0) {

    }

  }
  const rdm_numbers_occ = countOccurrencesAndPercentages(rdm_numbers);
  console.log(rdm_numbers_occ);

  // console.log(rdm_numbers_occ.percentages);

}

for (let index = 0; index < 1; index++) {
  main();

}
