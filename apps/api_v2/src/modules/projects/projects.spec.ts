import { describe, expect, it } from "vitest";
import { RequestMethod } from "@nestjs/common";
import { ProjectInvitesController } from "./project-invites.controller.js";
import { ProjectTransfersController } from "./project-transfers.controller.js";
import { ProjectsController } from "./projects.controller.js";
import { Capability } from "../../common/authz/capabilities.js";
import { CapabilityGuard } from "../../common/authz/capability.guard.js";
import { REQUIRED_CAPABILITIES_KEY } from "../../common/authz/require-capability.decorator.js";
import { UserActorGuard } from "../../common/guards/user-actor.guard.js";

const PATH_METADATA = "path";
const METHOD_METADATA = "method";
const GUARDS_METADATA = "__guards__";

describe("ProjectsController", () => {
  it("is defined", () => {
    expect(ProjectsController).toBeDefined();
  });

  it("declares GET /projects", () => {
    expect(Reflect.getMetadata(PATH_METADATA, ProjectsController)).toBe(
      "projects",
    );
    expect(
      Reflect.getMetadata(PATH_METADATA, ProjectsController.prototype.list),
    ).toBe("/");
    expect(
      Reflect.getMetadata(METHOD_METADATA, ProjectsController.prototype.list),
    ).toBe(RequestMethod.GET);
  });

  it("declares project CRUD routes", () => {
    expect(
      Reflect.getMetadata(PATH_METADATA, ProjectsController.prototype.create),
    ).toBe("/");
    expect(
      Reflect.getMetadata(METHOD_METADATA, ProjectsController.prototype.create),
    ).toBe(RequestMethod.POST);

    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        ProjectsController.prototype.getBySlug,
      ),
    ).toBe(":slug");
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        ProjectsController.prototype.getBySlug,
      ),
    ).toBe(RequestMethod.GET);

    expect(
      Reflect.getMetadata(PATH_METADATA, ProjectsController.prototype.update),
    ).toBe(":slug");
    expect(
      Reflect.getMetadata(METHOD_METADATA, ProjectsController.prototype.update),
    ).toBe(RequestMethod.PATCH);

    expect(
      Reflect.getMetadata(PATH_METADATA, ProjectsController.prototype.delete),
    ).toBe(":slug");
    expect(
      Reflect.getMetadata(METHOD_METADATA, ProjectsController.prototype.delete),
    ).toBe(RequestMethod.DELETE);
  });

  it("declares allowed-origin routes", () => {
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        ProjectsController.prototype.listAllowedOrigins,
      ),
    ).toBe(":slug/allowed-origins");
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        ProjectsController.prototype.listAllowedOrigins,
      ),
    ).toBe(RequestMethod.GET);

    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        ProjectsController.prototype.replaceAllowedOrigins,
      ),
    ).toBe(":slug/allowed-origins");
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        ProjectsController.prototype.replaceAllowedOrigins,
      ),
    ).toBe(RequestMethod.PUT);
  });

  it("declares signing-secret routes", () => {
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        ProjectsController.prototype.generateSigningSecret,
      ),
    ).toBe(":slug/signing-secret");
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        ProjectsController.prototype.generateSigningSecret,
      ),
    ).toBe(RequestMethod.POST);

    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        ProjectsController.prototype.clearSigningSecret,
      ),
    ).toBe(":slug/signing-secret");
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        ProjectsController.prototype.clearSigningSecret,
      ),
    ).toBe(RequestMethod.DELETE);
  });

  it("declares member list and add routes", () => {
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        ProjectsController.prototype.listMembers,
      ),
    ).toBe(":slug/members");
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        ProjectsController.prototype.listMembers,
      ),
    ).toBe(RequestMethod.GET);

    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        ProjectsController.prototype.addMember,
      ),
    ).toBe(":slug/members");
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        ProjectsController.prototype.addMember,
      ),
    ).toBe(RequestMethod.POST);
  });

  it("declares ownership transfer routes", () => {
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        ProjectsController.prototype.getOwnershipTransfer,
      ),
    ).toBe(":slug/ownership-transfer");
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        ProjectsController.prototype.getOwnershipTransfer,
      ),
    ).toBe(RequestMethod.GET);

    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        ProjectsController.prototype.initiateOwnershipTransfer,
      ),
    ).toBe(":slug/ownership-transfer");
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        ProjectsController.prototype.initiateOwnershipTransfer,
      ),
    ).toBe(RequestMethod.POST);

    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        ProjectsController.prototype.cancelOwnershipTransfer,
      ),
    ).toBe(":slug/ownership-transfer");
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        ProjectsController.prototype.cancelOwnershipTransfer,
      ),
    ).toBe(RequestMethod.DELETE);
  });

  it("declares member invite routes", () => {
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        ProjectsController.prototype.listMemberInvites,
      ),
    ).toBe(":slug/members/invites");
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        ProjectsController.prototype.listMemberInvites,
      ),
    ).toBe(RequestMethod.GET);

    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        ProjectsController.prototype.createMemberInvite,
      ),
    ).toBe(":slug/members/invites");
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        ProjectsController.prototype.createMemberInvite,
      ),
    ).toBe(RequestMethod.POST);

    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        ProjectsController.prototype.revokeMemberInvite,
      ),
    ).toBe(":slug/members/invites/:inviteId");
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        ProjectsController.prototype.revokeMemberInvite,
      ),
    ).toBe(RequestMethod.DELETE);
  });

  it("declares member update and delete routes", () => {
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        ProjectsController.prototype.updateMember,
      ),
    ).toBe(":slug/members/:userId");
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        ProjectsController.prototype.updateMember,
      ),
    ).toBe(RequestMethod.PATCH);

    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        ProjectsController.prototype.removeMember,
      ),
    ).toBe(":slug/members/:userId");
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        ProjectsController.prototype.removeMember,
      ),
    ).toBe(RequestMethod.DELETE);
  });

  it("applies capability guard metadata to protected routes", () => {
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        ProjectsController.prototype.getBySlug,
      ),
    ).toEqual([CapabilityGuard]);
    expect(
      Reflect.getMetadata(
        REQUIRED_CAPABILITIES_KEY,
        ProjectsController.prototype.getBySlug,
      ),
    ).toEqual([Capability.VIEW_PROJECT]);

    expect(
      Reflect.getMetadata(GUARDS_METADATA, ProjectsController.prototype.update),
    ).toEqual([CapabilityGuard]);
    expect(
      Reflect.getMetadata(
        REQUIRED_CAPABILITIES_KEY,
        ProjectsController.prototype.update,
      ),
    ).toEqual([Capability.MANAGE_PROJECT]);

    expect(
      Reflect.getMetadata(
        REQUIRED_CAPABILITIES_KEY,
        ProjectsController.prototype.listMembers,
      ),
    ).toEqual([Capability.VIEW_PROJECT]);
    expect(
      Reflect.getMetadata(
        REQUIRED_CAPABILITIES_KEY,
        ProjectsController.prototype.listMemberInvites,
      ),
    ).toEqual([Capability.VIEW_PROJECT]);
    expect(
      Reflect.getMetadata(
        REQUIRED_CAPABILITIES_KEY,
        ProjectsController.prototype.addMember,
      ),
    ).toEqual([Capability.MANAGE_MEMBERS]);
    expect(
      Reflect.getMetadata(
        REQUIRED_CAPABILITIES_KEY,
        ProjectsController.prototype.createMemberInvite,
      ),
    ).toEqual([Capability.MANAGE_MEMBERS]);
    expect(
      Reflect.getMetadata(
        REQUIRED_CAPABILITIES_KEY,
        ProjectsController.prototype.revokeMemberInvite,
      ),
    ).toEqual([Capability.MANAGE_MEMBERS]);
    expect(
      Reflect.getMetadata(
        REQUIRED_CAPABILITIES_KEY,
        ProjectsController.prototype.updateMember,
      ),
    ).toEqual([Capability.MANAGE_MEMBERS]);
    expect(
      Reflect.getMetadata(
        REQUIRED_CAPABILITIES_KEY,
        ProjectsController.prototype.removeMember,
      ),
    ).toEqual([Capability.MANAGE_MEMBERS]);
    expect(
      Reflect.getMetadata(
        REQUIRED_CAPABILITIES_KEY,
        ProjectsController.prototype.getOwnershipTransfer,
      ),
    ).toEqual([Capability.VIEW_PROJECT]);
    expect(
      Reflect.getMetadata(
        REQUIRED_CAPABILITIES_KEY,
        ProjectsController.prototype.initiateOwnershipTransfer,
      ),
    ).toEqual([Capability.MANAGE_PROJECT]);
    expect(
      Reflect.getMetadata(
        REQUIRED_CAPABILITIES_KEY,
        ProjectsController.prototype.cancelOwnershipTransfer,
      ),
    ).toEqual([Capability.MANAGE_PROJECT]);
    expect(
      Reflect.getMetadata(
        REQUIRED_CAPABILITIES_KEY,
        ProjectsController.prototype.listAllowedOrigins,
      ),
    ).toEqual([Capability.MANAGE_PROJECT]);
    expect(
      Reflect.getMetadata(
        REQUIRED_CAPABILITIES_KEY,
        ProjectsController.prototype.replaceAllowedOrigins,
      ),
    ).toEqual([Capability.MANAGE_PROJECT]);
    expect(
      Reflect.getMetadata(
        REQUIRED_CAPABILITIES_KEY,
        ProjectsController.prototype.generateSigningSecret,
      ),
    ).toEqual([Capability.MANAGE_PROJECT]);
    expect(
      Reflect.getMetadata(
        REQUIRED_CAPABILITIES_KEY,
        ProjectsController.prototype.clearSigningSecret,
      ),
    ).toEqual([Capability.MANAGE_PROJECT]);
  });
});

describe("ProjectInvitesController", () => {
  it("declares the authenticated self-service accept route", () => {
    expect(Reflect.getMetadata(PATH_METADATA, ProjectInvitesController)).toBe(
      "me/project-invites",
    );
    expect(Reflect.getMetadata(GUARDS_METADATA, ProjectInvitesController)).toEqual(
      [UserActorGuard],
    );
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        ProjectInvitesController.prototype.accept,
      ),
    ).toBe(":inviteId/accept");
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        ProjectInvitesController.prototype.accept,
      ),
    ).toBe(RequestMethod.POST);
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        ProjectInvitesController.prototype.accept,
      ),
    ).toBeUndefined();
    expect(
      Reflect.getMetadata(
        REQUIRED_CAPABILITIES_KEY,
        ProjectInvitesController.prototype.accept,
      ),
    ).toBeUndefined();
  });
});

describe("ProjectTransfersController", () => {
  it("declares authenticated self-service ownership transfer routes", () => {
    expect(Reflect.getMetadata(PATH_METADATA, ProjectTransfersController)).toBe(
      "me/project-transfers",
    );
    expect(
      Reflect.getMetadata(GUARDS_METADATA, ProjectTransfersController),
    ).toEqual([UserActorGuard]);
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        ProjectTransfersController.prototype.list,
      ),
    ).toBe("/");
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        ProjectTransfersController.prototype.list,
      ),
    ).toBe(RequestMethod.GET);
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        ProjectTransfersController.prototype.accept,
      ),
    ).toBe(":transferId/accept");
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        ProjectTransfersController.prototype.accept,
      ),
    ).toBe(RequestMethod.POST);
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        ProjectTransfersController.prototype.decline,
      ),
    ).toBe(":transferId/decline");
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        ProjectTransfersController.prototype.decline,
      ),
    ).toBe(RequestMethod.POST);
  });
});
