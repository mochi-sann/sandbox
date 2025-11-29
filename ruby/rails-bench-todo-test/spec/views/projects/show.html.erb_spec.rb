require 'rails_helper'

RSpec.describe "projects/show", type: :view do
  before(:each) do
    assign(:project, create(:project, name: "Name", description: "MyText"))
  end

  it "renders attributes in <p>" do
    render
    expect(rendered).to match(/Name/)
    expect(rendered).to match(/MyText/)
    expect(rendered).to match(//)
  end
end
