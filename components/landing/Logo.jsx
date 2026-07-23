import Image from "next/image";
import Link from "next/link";
import logo from "@/public/logo.png";

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-3 group">
      <div className=" w-14 group-hover:scale-105 transition-transform">
        <Image src={logo} alt="AI Marketing OS" className="w-full h-auto" />
      </div>
    </Link>
  );
}

export default Logo;
