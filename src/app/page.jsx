import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ROUTES } from "@/lib/constants";

export default async function Home() {
    const cookieStore = await cookies();
    const token = cookieStore.get("quickcon_token");

    if (token) {
        // User is authenticated, redirect to dashboard
        // The actual role-based redirect will happen in the dashboard
        redirect(ROUTES.ADMIN_DASHBOARD);
    } else {
        // User is not authenticated, redirect to login
        redirect(ROUTES.LOGIN);
    }
}
