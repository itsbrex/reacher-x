"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  PageHeader,
  PageLayout,
  PageContent,
} from "@/features/webapp/ui/components";
import { useLinkedAccounts } from "@/features/linked-accounts/hooks/useLinkedAccounts";
import {
  AccountCard,
  AccountCardSkeleton,
} from "@/features/linked-accounts/ui/components";

// components moved to features/linked-accounts

export default function LinkedAccountsPage() {
  const router = useRouter();
  const { accounts, isLoading, reconnectAccount } = useLinkedAccounts();

  const handleDisconnect = (accountId: string) => {
    // TODO: Implement disconnect logic
    console.log("Disconnecting account:", accountId);
  };

  return (
    <PageLayout>
      <PageHeader title="Linked accounts" onBack={() => router.back()} />
      <PageContent className="mx-4 mt-4">
        <div className="space-y-4">
          {/* Loading state */}
          {isLoading && (
            <>
              <AccountCardSkeleton />
              <AccountCardSkeleton />
            </>
          )}

          {/* Account cards */}
          {!isLoading && accounts.length > 0 && (
            <div className="space-y-4">
              {accounts.map((account) => (
                <AccountCard
                  key={account.id}
                  provider={account.provider}
                  accountName={account.accountName}
                  accountHandle={account.accountHandle}
                  isConnected={account.isConnected}
                  connectedAt={account.connectedAt}
                  onReconnect={() => reconnectAccount(account.id)}
                  onDisconnect={() => handleDisconnect(account.id)}
                />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && accounts.length === 0 && (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">
                No linked accounts found. Connect your social media accounts to
                get started.
              </p>
            </div>
          )}
        </div>
      </PageContent>
    </PageLayout>
  );
}
