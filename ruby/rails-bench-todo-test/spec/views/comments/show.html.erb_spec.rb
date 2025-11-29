require 'rails_helper'

RSpec.describe "comments/show", type: :view do
  before(:each) do
    assign(:comment, create(:comment, content: "MyText"))
  end

  it "renders attributes in <p>" do
    render
    expect(rendered).to match(//)
    expect(rendered).to match(//)
    expect(rendered).to match(/MyText/)
  end
end
