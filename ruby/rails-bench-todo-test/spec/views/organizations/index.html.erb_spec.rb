require 'rails_helper'

RSpec.describe "organizations/index", type: :view do
  before(:each) do
    assign(:organizations, [
      create(:organization, name: "Name 1"),
      create(:organization, name: "Name 2")
    ])
  end

  it "renders a list of organizations" do
    render
    cell_selector = 'div>p'
    assert_select cell_selector, text: Regexp.new("Name".to_s), count: 2
  end
end
