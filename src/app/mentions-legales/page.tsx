import type { Metadata } from "next";
import { Navbar, Footer } from "@/components/blocks";

export const metadata: Metadata = {
  title: "Mentions légales | The Webmaster",
  description:
    "Mentions légales du site The Webmaster, agence digitale basée à Bruxelles, Belgique. Informations sur l'éditeur, l'hébergement et les conditions d'utilisation.",
};

export default function MentionsLegalesPage() {
  return (
    <main>
      <Navbar />

      <article className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Mentions légales
          </h1>
          <p className="text-muted-foreground mb-12">
            Dernière mise à jour : 27 février 2026
          </p>

          {/* Éditeur du site */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">
              1. Éditeur du site
            </h2>
            <div className="text-muted-foreground space-y-1 leading-relaxed">
              <p>
                Le site{" "}
                <strong className="text-foreground">thewebmaster.pro</strong> est
                édité par :
              </p>
              <ul className="list-none space-y-1 mt-3">
                <li>
                  <strong className="text-foreground">Raison sociale :</strong>{" "}
                  The Webmaster
                </li>
                <li>
                  <strong className="text-foreground">Siège social :</strong>{" "}
                  Grimbergen, Belgique
                </li>
                <li>
                  <strong className="text-foreground">Numéro de TVA :</strong>{" "}
                  BE0872.230.730
                </li>
                <li>
                  <strong className="text-foreground">Email :</strong>{" "}
                  <a
                    href="mailto:contact@thewebmaster.pro"
                    className="text-primary hover:underline"
                  >
                    contact@thewebmaster.pro
                  </a>
                </li>
                <li>
                  <strong className="text-foreground">Téléphone :</strong>{" "}
                  <a
                    href="tel:+32491348143"
                    className="text-primary hover:underline"
                  >
                    +32 491 34 81 43
                  </a>
                </li>
              </ul>
            </div>
          </section>

          {/* Hébergement */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">2. Hébergement</h2>
            <div className="text-muted-foreground space-y-1 leading-relaxed">
              <p>Le site est hébergé par :</p>
              <ul className="list-none space-y-1 mt-3">
                <li>
                  <strong className="text-foreground">Hébergeur :</strong>{" "}
                  Hostinger International Ltd.
                </li>
                <li>
                  <strong className="text-foreground">Adresse :</strong>{" "}
                  61 Lordou Vironos Street, 6023 Larnaca, Chypre
                </li>
                <li>
                  <strong className="text-foreground">Site web :</strong>{" "}
                  <a
                    href="https://www.hostinger.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    hostinger.com
                  </a>
                </li>
              </ul>
            </div>
          </section>

          {/* Propriété intellectuelle */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">
              3. Propriété intellectuelle
            </h2>
            <div className="text-muted-foreground space-y-3 leading-relaxed">
              <p>
                L&apos;ensemble du contenu du site thewebmaster.pro, incluant
                sans limitation les textes, images, graphismes, logos, icônes,
                vidéos, logiciels et tout autre élément, est la propriété
                exclusive de The Webmaster ou de ses partenaires, et est protégé
                par les lois belges et internationales relatives à la propriété
                intellectuelle.
              </p>
              <p>
                Toute reproduction, représentation, modification, publication,
                distribution ou exploitation, totale ou partielle, du contenu du
                site, par quelque procédé que ce soit, sans l&apos;autorisation
                écrite préalable de The Webmaster, est strictement interdite et
                constitue une contrefaçon sanctionnée par le Code de droit
                économique belge.
              </p>
            </div>
          </section>

          {/* Limitation de responsabilité */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">
              4. Limitation de responsabilité
            </h2>
            <div className="text-muted-foreground space-y-3 leading-relaxed">
              <p>
                The Webmaster s&apos;efforce de fournir sur le site des
                informations aussi précises que possible. Toutefois, la société
                ne pourra être tenue responsable des omissions, inexactitudes ou
                carences dans la mise à jour de ces informations, qu&apos;elles
                soient de son fait ou du fait de tiers partenaires.
              </p>
              <p>
                Les informations fournies sur le site le sont à titre indicatif
                et ne sauraient dispenser l&apos;utilisateur d&apos;une analyse
                complémentaire et personnalisée. The Webmaster ne saurait être
                tenu responsable de tout dommage, direct ou indirect, résultant
                de l&apos;utilisation du site ou de l&apos;impossibilité
                d&apos;y accéder.
              </p>
            </div>
          </section>

          {/* Liens hypertextes */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">
              5. Liens hypertextes
            </h2>
            <div className="text-muted-foreground space-y-3 leading-relaxed">
              <p>
                Le site peut contenir des liens hypertextes vers d&apos;autres
                sites internet. The Webmaster n&apos;exerce aucun contrôle sur
                ces sites externes et décline toute responsabilité quant à leur
                contenu, leurs pratiques de confidentialité ou leur
                fonctionnement.
              </p>
              <p>
                La mise en place de liens hypertextes vers le site
                thewebmaster.pro nécessite l&apos;autorisation préalable et
                écrite de The Webmaster.
              </p>
            </div>
          </section>

          {/* Cookies */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">6. Cookies</h2>
            <div className="text-muted-foreground space-y-3 leading-relaxed">
              <p>
                Le site thewebmaster.pro peut utiliser des cookies pour améliorer
                l&apos;expérience utilisateur. Pour en savoir plus sur
                l&apos;utilisation des cookies et la gestion de vos données
                personnelles, veuillez consulter notre{" "}
                <a
                  href="/politique-de-confidentialite"
                  className="text-primary hover:underline"
                >
                  politique de confidentialité
                </a>
                .
              </p>
            </div>
          </section>

          {/* Droit applicable */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">
              7. Droit applicable et juridiction compétente
            </h2>
            <div className="text-muted-foreground space-y-3 leading-relaxed">
              <p>
                Les présentes mentions légales sont régies par le droit belge.
                En cas de litige, et après tentative de recherche d&apos;une
                solution amiable, compétence exclusive est attribuée aux
                tribunaux de Bruxelles, Belgique.
              </p>
            </div>
          </section>
        </div>
      </article>

      <Footer
        logo={
          <span className="text-xl font-bold tracking-tight">
            The<span className="text-primary">Webmaster</span>
          </span>
        }
        description="Agence digitale belge spécialisée en création web, design graphique, réseaux sociaux et publicité digitale. Transformez votre présence en ligne."
        columns={[
          {
            title: "Services",
            links: [
              { label: "Création de sites web", url: "/#services" },
              { label: "Design graphique", url: "/#services" },
              { label: "Réseaux sociaux", url: "/#services" },
              { label: "Publicité digitale", url: "/#services" },
              { label: "Solutions digitales", url: "/#services" },
            ],
          },
          {
            title: "Entreprise",
            links: [
              { label: "À propos", url: "/#about" },
              { label: "Notre processus", url: "/#processus" },
              { label: "FAQ", url: "/#faq" },
              { label: "Contact", url: "/#contact" },
            ],
          },
          {
            title: "Contact",
            links: [
              { label: "+32 491 34 81 43", url: "tel:+32491348143" },
              {
                label: "contact@thewebmaster.pro",
                url: "mailto:contact@thewebmaster.pro",
              },
              { label: "Bruxelles, Belgique", url: "/#contact" },
            ],
          },
        ]}
        social={[
          {
            platform: "linkedin",
            url: "https://www.linkedin.com/company/thewebmaster",
          },
          {
            platform: "instagram",
            url: "https://www.instagram.com/thewebmaster.pro",
          },
          {
            platform: "facebook",
            url: "https://www.facebook.com/thewebmaster.pro",
          },
        ]}
        legal={[
          { label: "Mentions légales", url: "/mentions-legales" },
          {
            label: "Politique de confidentialité",
            url: "/politique-de-confidentialite",
          },
        ]}
        copyright="© 2024 The Webmaster. Tous droits réservés."
      />
    </main>
  );
}
