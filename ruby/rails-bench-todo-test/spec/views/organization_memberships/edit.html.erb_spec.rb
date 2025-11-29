require 'rails_helper'

RSpec.describe "organization_memberships/edit", type: :view do
  let(:organization_membership) {
    create(:organization_membership)
  }

  before(:each) do
    assign(:organization_membership, organization_membership)
  end

  it "renders the edit organization_membership form" do
    render

    assert_select "form[action=?][method=?]", organization_membership_path(organization_membership), "post" do

      assert_select "input[name=?]", "organization_membership[user_id]"

      assert_select "input[name=?]", "organization_membership[organization_id]"

      assert_select "input[name=?]", "organization_membership[role]"
    end
  end
end
