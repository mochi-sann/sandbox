require 'rails_helper'

RSpec.describe "categories/index", type: :view do
  before(:each) do
    assign(:categories, [
      create(:category, name: "Name"),
      create(:category, name: "Name")
    ])
  end

  it "renders a list of categories" do
    render
    cell_selector = 'div>p'
    assert_select cell_selector, text: Regexp.new("Name".to_s), count: 2
    assert_select cell_selector, text: Regexp.new(nil.to_s), count: 2
  end
end
