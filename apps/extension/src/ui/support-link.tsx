import { Coffee02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Button } from '../components/ui/button';

export function SupportLink() {
  return (
    <Button variant="outline" size="sm" className="ml-auto" asChild>
      <a
        href="https://www.supportkori.com/montasim"
        target="_blank"
        rel="noreferrer"
        aria-label="Support BugReceipt on SupportKori"
      >
        <HugeiconsIcon icon={Coffee02Icon} aria-hidden="true" />
        Support
      </a>
    </Button>
  );
}
