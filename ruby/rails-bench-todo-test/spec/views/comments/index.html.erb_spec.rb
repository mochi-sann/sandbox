require 'rails_helper'

RSpec.describe "comments/index", type: :view do
  before(:each) do
    assign(:comments, [
      create(:comment, content: "MyText"),
      create(:comment, content: "MyText")
    ])
  end

  it "renders a list of comments" do
    render
    cell_selector = 'div>p'
    assert_select cell_selector, text: Regexp.new(nil.to_s), count: 4
    assert_select cell_selector, text: Regexp.new("MyText".to_s), count: 2
  end
end
