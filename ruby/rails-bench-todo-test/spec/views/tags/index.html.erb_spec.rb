require 'rails_helper'

RSpec.describe "tags/index", type: :view do
  before(:each) do
    assign(:tags, [
      create(:tag, name: "Name 1"),
      create(:tag, name: "Name 2")
    ])
  end

  it "renders a list of tags" do
    render
    cell_selector = 'div>p'
    assert_select cell_selector, text: Regexp.new("Name".to_s), count: 2
    assert_select cell_selector, text: Regexp.new("Color".to_s), count: 2
  end
end
