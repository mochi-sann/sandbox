import 'package:hello_dart/hello_dart.dart' as hello_dart;

fizzBuzz(int num, [int fizz = 3, int buzz = 5]) {
  if (num % fizz == 0 && num % buzz == 0) {
    return "FizzBuzz";
  } else if (num % fizz == 0) {
    return "Fizz";
  } else if (num % buzz == 0) {
    return "Buzz";
  } else {
    return num;
  }
}

const start = 1;
const stop  = 100;

void main(List<String> arguments) {
  print('Hello world: ${hello_dart.calculate()}!');
  print('Hello world: ${hello_dart.sum( 100 , 200)}!');
  for (var i = start; i <= stop; i++) {
    var result = fizzBuzz(i);
    print("${i} is ${result}");
  }


}
