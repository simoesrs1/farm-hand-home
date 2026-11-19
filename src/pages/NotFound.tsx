import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/PageHeader";
import { useTranslation } from "react-i18next";

const NotFound = () => {
  const location = useLocation();
  const { t } = useTranslation("home");

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <main className="py-24">
      <div className="container flex max-w-2xl flex-col items-center text-center">
        <PageHeader
          className="justify-center"
          eyebrow={t("notFound.eyebrow")}
          title={t("notFound.title")}
          description={t("notFound.description")}
        />
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link to="/">{t("notFound.home")}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/catalogo">{t("notFound.catalog")}</Link>
          </Button>
        </div>
      </div>
    </main>
  );
};

export default NotFound;
