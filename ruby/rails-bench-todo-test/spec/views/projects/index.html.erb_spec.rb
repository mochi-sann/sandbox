require 'rails_helper'

RSpec.describe "projects/index", type: :view do
  before(:each) do
    assign(:projects, [
      create(:project, name: "Name 1", description: "MyText"),
      create(:project, name: "Name 2", description: "MyText")
    ])
  end

  it "renders a list of projects" do
    render
    cell_selector = 'div>p'
    assert_select cell_selector, count: 8
  end
end
