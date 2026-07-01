import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ListPagination } from "@/components/common/ListPagination";

describe("ListPagination", () => {
  it("renders the showing range and total", () => {
    render(
      <ListPagination
        meta={{ page: 1, limit: 20, total: 50 }}
        onPageChange={() => {}}
      />,
    );
    expect(screen.getByText("Showing 1–20 of 50")).toBeInTheDocument();
    expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
  });

  it("shows zero range when total is 0", () => {
    render(
      <ListPagination
        meta={{ page: 1, limit: 20, total: 0 }}
        onPageChange={() => {}}
      />,
    );
    expect(screen.getByText("Showing 0–0 of 0")).toBeInTheDocument();
    expect(screen.getByText("Page 1 of 1")).toBeInTheDocument();
  });

  it("disables the previous button on the first page", () => {
    render(
      <ListPagination
        meta={{ page: 1, limit: 20, total: 100 }}
        onPageChange={() => {}}
      />,
    );
    expect(screen.getByLabelText("Previous page")).toBeDisabled();
    expect(screen.getByLabelText("Next page")).not.toBeDisabled();
  });

  it("disables the next button on the last page", () => {
    render(
      <ListPagination
        meta={{ page: 5, limit: 20, total: 100 }}
        onPageChange={() => {}}
      />,
    );
    expect(screen.getByLabelText("Previous page")).not.toBeDisabled();
    expect(screen.getByLabelText("Next page")).toBeDisabled();
  });

  it("invokes onPageChange when prev/next are clicked", async () => {
    const onPageChange = vi.fn();
    render(
      <ListPagination
        meta={{ page: 2, limit: 20, total: 100 }}
        onPageChange={onPageChange}
      />,
    );
    await userEvent.click(screen.getByLabelText("Previous page"));
    expect(onPageChange).toHaveBeenCalledWith(1);
    await userEvent.click(screen.getByLabelText("Next page"));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it("renders the page-size selector when onPageSizeChange is provided", async () => {
    const onPageSizeChange = vi.fn();
    render(
      <ListPagination
        meta={{ page: 1, limit: 20, total: 100 }}
        onPageChange={() => {}}
        onPageSizeChange={onPageSizeChange}
      />,
    );
    expect(screen.getByText("20 / page")).toBeInTheDocument();
  });

  it("does not render the page-size selector when onPageSizeChange is omitted", () => {
    render(
      <ListPagination
        meta={{ page: 1, limit: 20, total: 100 }}
        onPageChange={() => {}}
      />,
    );
    expect(screen.queryByText("20 / page")).not.toBeInTheDocument();
  });

  it("appends the extra className to the container", () => {
    const { container } = render(
      <ListPagination
        meta={{ page: 1, limit: 20, total: 0 }}
        onPageChange={() => {}}
        className="custom-class"
      />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain("custom-class");
  });
});
