require 'rails_helper'

RSpec.describe OrganizationMembership, type: :model do
  it { should belong_to(:user) }
  it { should belong_to(:organization) }
  it { should validate_presence_of(:role) }
  it { should define_enum_for(:role).with_values(member: "member", admin: "admin").backed_by_column_of_type(:string) }

  it 'validates uniqueness of user_id scoped to organization_id' do
    user = create(:user) # create a user using FactoryBot
    organization = create(:organization) # create an organization using FactoryBot
    create(:organization_membership, user: user, organization: organization) # create a membership
    should validate_uniqueness_of(:user_id).scoped_to(:organization_id)
  end
end
