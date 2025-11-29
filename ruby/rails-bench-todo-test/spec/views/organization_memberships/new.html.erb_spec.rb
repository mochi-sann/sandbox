require 'rails_helper'

RSpec.describe "organization_memberships/new", type: :view do
  before(:each) do
    assign(:organization_membership, OrganizationMembership.new(
      user: nil,
      organization: nil,
      role: :member
    ))
  end

  it "renders new organization_membership form" do
    render

    assert_select "form[action=?][method=?]", organization_memberships_path, "post" do

      assert_select "input[name=?]", "organization_membership[user_id]"

      assert_select "input[name=?]", "organization_membership[organization_id]"

      assert_select "input[name=?]", "organization_membership[role]"
    end
  end
end
