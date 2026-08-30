import type { ReactNode } from 'react';

interface RenderIfElseProps {
  condition: boolean;
  ifTrue: ReactNode;
  ifFalse: ReactNode;
}

export default function RenderIfElse({ condition, ifTrue, ifFalse }: RenderIfElseProps) {
  return condition ? ifTrue : ifFalse;
}
