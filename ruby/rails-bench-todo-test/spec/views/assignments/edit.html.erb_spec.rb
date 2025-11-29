require 'rails_helper'

RSpec.describe "assignments/edit", type: :view do
  let(:assignment) {
    create(:assignment)
  }

  before(:each) do
    assign(:assignment, assignment)
  end

  it "renders the edit assignment form" do
    render

    assert_select "form[action=?][method=?]", assignment_path(assignment), "post" do

      assert_select "input[name=?]", "assignment[todo_id]"

      assert_select "input[name=?]", "assignment[user_id]"
    end
  end
end
