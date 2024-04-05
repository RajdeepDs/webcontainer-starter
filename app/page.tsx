import dynamic from "next/dynamic";

const Component = dynamic(() => import("@/components/comp"), { ssr: false });

export default function HomePage() {
  return (
    <>
      <Component />
    </>
  );
}
