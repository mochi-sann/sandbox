class OrganizationMembershipsController < ApplicationController
  before_action :set_organization_membership, only: %i[ show edit update destroy ]

  # GET /organization_memberships or /organization_memberships.json
  def index
    @organization_memberships = OrganizationMembership.all
  end

  # GET /organization_memberships/1 or /organization_memberships/1.json
  def show
  end

  # GET /organization_memberships/new
  def new
    @organization_membership = OrganizationMembership.new
  end

  # GET /organization_memberships/1/edit
  def edit
  end

  # POST /organization_memberships or /organization_memberships.json
  def create
    @organization_membership = OrganizationMembership.new(organization_membership_params)

    respond_to do |format|
      if @organization_membership.save
        format.html { redirect_to @organization_membership, notice: "Organization membership was successfully created." }
        format.json { render :show, status: :created, location: @organization_membership }
      else
        format.html { render :new, status: :unprocessable_entity }
        format.json { render json: @organization_membership.errors, status: :unprocessable_entity }
      end
    end
  end

  # PATCH/PUT /organization_memberships/1 or /organization_memberships/1.json
  def update
    respond_to do |format|
      if @organization_membership.update(organization_membership_params)
        format.html { redirect_to @organization_membership, notice: "Organization membership was successfully updated.", status: :see_other }
        format.json { render :show, status: :ok, location: @organization_membership }
      else
        format.html { render :edit, status: :unprocessable_entity }
        format.json { render json: @organization_membership.errors, status: :unprocessable_entity }
      end
    end
  end

  # DELETE /organization_memberships/1 or /organization_memberships/1.json
  def destroy
    @organization_membership.destroy!

    respond_to do |format|
      format.html { redirect_to organization_memberships_path, notice: "Organization membership was successfully destroyed.", status: :see_other }
      format.json { head :no_content }
    end
  end

  private
    # Use callbacks to share common setup or constraints between actions.
    def set_organization_membership
      @organization_membership = OrganizationMembership.find(params.expect(:id))
    end

    # Only allow a list of trusted parameters through.
    def organization_membership_params
      params.expect(organization_membership: [ :user_id, :organization_id, :role ])
    end
end
