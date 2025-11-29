require 'rails_helper'

RSpec.describe Todo, type: :model do
  it "is valid with a title" do
    todo = Todo.new(title: "Something")
    expect(todo).to be_valid
  end

  it "is invalid without a title" do
    todo = Todo.new(title: nil)
    expect(todo).not_to be_valid
    expect(todo.errors[:title]).to include("can't be blank")
  end
end
