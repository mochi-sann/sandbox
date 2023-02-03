#[derive(Debug)]
struct User {
    name: String,
    age: i32,
}

impl User {
    fn new(name: String, age: i32) -> Self {
        Self { name, age }
    }
    fn description(&self) -> String {
        format!("user name is {} age is {}", &self.name, &self.name)
    }
    fn rename(&mut self, name: String) {
        self.name = name
    }
    fn get_name(&self) -> String {
        return format!("{}", &self.name);
    }
}

fn main() {
    let mut user = User::new(String::from("'hello world this is name'"), 300);
    println!("{}", user.description());
    user.rename(String::from("This IS NEW NAME"));
    println!("{}", user.description());
    println!("{}", user.get_name());
}
