"use client";

import * as React from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/ui/components/Collapsible";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/shared/ui/components/Sidebar";
import { ChevronRight } from "lucide-react";

// Mock data (replace with Convex backend fetch later)
const keywordHistory = {
  pinned: [
    { keyword: "web coder needed", count: 16 },
    { keyword: "suck at web dev", count: 16 },
  ],
  history: [
    {
      group: "Today",
      keywords: [
        { keyword: "keyword1", count: 10 },
        { keyword: "keyword2", count: 5 },
      ],
    },
    {
      group: "Yesterday",
      keywords: [
        { keyword: "keyword3", count: 8 },
      ],
    },
  ],
};

export function KeywordHistory() {
  return (
    <>
      <SidebarGroup>
        <SidebarGroupLabel>Pinned keywords</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {keywordHistory.pinned.map((item, index) => (
              <SidebarMenuItem key={index}>
                <SidebarMenuButton>{item.keyword}</SidebarMenuButton>
                <SidebarMenuBadge>{item.count}</SidebarMenuBadge>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup>
        <SidebarGroupLabel>Keyword history</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {keywordHistory.history.map((group, index) => (
              <Collapsible key={index}>
                <CollapsibleTrigger asChild>
                  <SidebarMenuItem>
                    <SidebarMenuButton>
                      <ChevronRight className="mr-2 h-4 w-4 transition-transform group-data-[state=open]:rotate-90" />
                      {group.group}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  {group.keywords.map((item, idx) => (
                    <SidebarMenuItem key={idx} className="pl-4">
                      <SidebarMenuButton>{item.keyword}</SidebarMenuButton>
                      <SidebarMenuBadge>{item.count}</SidebarMenuBadge>
                    </SidebarMenuItem>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </>
  );
}