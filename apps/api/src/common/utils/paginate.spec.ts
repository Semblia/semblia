import { describe, expect, it } from "vitest";
import { paginate } from "./paginate.js";

describe("paginate", () => {
  it("returns stable metadata for an empty page", () => {
    expect(
      paginate({
        data: [],
        total: 0,
        page: 1,
        pageSize: 10,
      }),
    ).toEqual({
      items: [],
      total: 0,
      page: 1,
      pageSize: 10,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    });
  });

  it("returns stable metadata for a middle page", () => {
    expect(
      paginate({
        data: [{ id: "item_11" }, { id: "item_12" }],
        total: 25,
        page: 2,
        pageSize: 10,
      }),
    ).toEqual({
      items: [{ id: "item_11" }, { id: "item_12" }],
      total: 25,
      page: 2,
      pageSize: 10,
      totalPages: 3,
      hasNext: true,
      hasPrev: true,
    });
  });

  it("returns stable metadata for a final page", () => {
    expect(
      paginate({
        data: [{ id: "item_21" }, { id: "item_22" }],
        total: 22,
        page: 3,
        pageSize: 10,
      }),
    ).toEqual({
      items: [{ id: "item_21" }, { id: "item_22" }],
      total: 22,
      page: 3,
      pageSize: 10,
      totalPages: 3,
      hasNext: false,
      hasPrev: true,
    });
  });
});
