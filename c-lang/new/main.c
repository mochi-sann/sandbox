#include <stdio.h>

int main() {
  int a[3];
  a[0] = 123;
  a[1] = 456;
  a[2] = 789;

  printf("%d %d %d\n", a[1], a[2], a[3]);
  printf("%d\n", a[4]);
}
