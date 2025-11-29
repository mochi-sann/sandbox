require 'rails_helper'

RSpec.describe "organization_memberships/index", type: :view do
  before(:each) do
    assign(:organization_memberships, [
      create(:organization_membership, role: :member),
      create(:organization_membership, role: :member)
    ])
  end

  it "renders a list of organization_memberships" do
    render
    cell_selector = 'div>p'
    assert_select cell_selector, count: 8
  end
end
