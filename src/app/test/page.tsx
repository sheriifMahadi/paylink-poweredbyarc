import { supabase } from "@/lib/supabase/client";

export default async function TestPage() {
  const { data, error } = await supabase
    .from("payment_requests")
    .select("*");

  console.log(data, error);

  return (
    <div className="p-10">
      Supabase Connected
    </div>
  );
}