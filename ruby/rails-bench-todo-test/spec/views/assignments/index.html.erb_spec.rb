require 'rails_helper'

RSpec.describe "assignments/index", type: :view do
  before(:each) do
    assign(:assignments, [
      create(:assignment),
      create(:assignment)
    ])
  end

  it "renders a list of assignments" do
    render
    cell_selector = 'div>p'
    assert_select cell_selector, text: Regexp.new(nil.to_s), count: 4
  end
end
