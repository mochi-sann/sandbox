require 'rails_helper'

RSpec.describe "organization_memberships/show", type: :view do
  before(:each) do
    assign(:organization_membership, create(:organization_membership, role: :member))
  end

  it "renders attributes in <p>" do
    render
    expect(rendered).to match(//)
    expect(rendered).to match(//)
    expect(rendered).to match(/member/)
  end
end
