import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Calendar } from "@/components/ui/calendar";
import { Toaster } from "@/components/ui/sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

describe("ui primitives", () => {
  it("renders button variants", () => {
    render(
      <>
        <Button>Default</Button>
        <Button variant="outline" size="sm">Outline</Button>
        <Button variant="destructive" asChild>
          <a href="/x">Link child</a>
        </Button>
      </>,
    );
    expect(screen.getByRole("button", { name: "Default" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Link child" })).toBeInTheDocument();
  });

  it("renders input, textarea, label, checkbox, and switch", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" placeholder="Enter name" />
        <Textarea placeholder="Notes" />
        <Checkbox aria-label="Agree" />
        <Switch aria-label="Toggle" />
      </div>,
    );

    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText("Enter name"), "Ada");
    await user.click(screen.getByLabelText("Agree"));
    await user.click(screen.getByLabelText("Toggle"));
  });

  it("renders dialog and overlay components", async () => {
    const user = userEvent.setup();
    render(
      <Dialog>
        <DialogTrigger asChild>
          <Button>Open dialog</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dialog title</DialogTitle>
            <DialogDescription>Dialog body</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>,
    );

    await user.click(screen.getByRole("button", { name: "Open dialog" }));
    expect(screen.getByText("Dialog title")).toBeInTheDocument();
  });

  it("renders dropdown menu", async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button>Open menu</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Item A</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    await user.click(screen.getByRole("button", { name: "Open menu" }));
    await waitFor(() => {
      expect(screen.getByText("Item A")).toBeInTheDocument();
    });
  });

  it("renders popovers, selects, tabs, and sheets", async () => {
    const user = userEvent.setup();
    render(
      <TooltipProvider>
        <Popover>
          <PopoverTrigger asChild>
            <Button>Open popover</Button>
          </PopoverTrigger>
          <PopoverContent>Popover body</PopoverContent>
        </Popover>

        <Select>
          <SelectTrigger aria-label="Pick one">
            <SelectValue placeholder="Choose" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="a">Alpha</SelectItem>
          </SelectContent>
        </Select>

        <Tabs defaultValue="one">
          <TabsList>
            <TabsTrigger value="one">One</TabsTrigger>
            <TabsTrigger value="two">Two</TabsTrigger>
          </TabsList>
          <TabsContent value="one">Tab one</TabsContent>
          <TabsContent value="two">Tab two</TabsContent>
        </Tabs>

        <RadioGroup defaultValue="a">
          <label>
            <RadioGroupItem value="a" /> A
          </label>
        </RadioGroup>

        <Collapsible defaultOpen>
          <CollapsibleTrigger>Toggle</CollapsibleTrigger>
          <CollapsibleContent>Collapsible body</CollapsibleContent>
        </Collapsible>

        <Sheet>
          <SheetTrigger asChild>
            <Button>Open sheet</Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Sheet title</SheetTitle>
            </SheetHeader>
          </SheetContent>
        </Sheet>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button>Tip</Button>
          </TooltipTrigger>
          <TooltipContent>Tooltip text</TooltipContent>
        </Tooltip>

        <Toaster />
      </TooltipProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Open popover" }));
    await waitFor(() => {
      expect(screen.getByText("Popover body")).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText("Pick one"));
    await user.click(screen.getByText("Alpha"));

    await user.click(screen.getByRole("tab", { name: "Two" }));
    expect(screen.getByText("Tab two")).toBeInTheDocument();
  });

  it("renders calendar", () => {
    render(<Calendar mode="single" selected={new Date("2026-06-01")} />);
    expect(document.querySelector(".rdp-root, [class*='calendar']")).toBeTruthy();
  });
});
