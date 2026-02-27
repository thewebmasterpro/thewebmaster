import type { Metadata } from "next";
import { Navbar, Footer } from "@/components/blocks";

export const metadata: Metadata = {
  title: "Politique de confidentialité | The Webmaster",
  description:
    "Politique de confidentialité de The Webmaster, agence digitale à Bruxelles. Découvrez comment nous collectons, utilisons et protégeons vos données personnelles conformément au RGPD.",
};

export default function PolitiqueDeConfidentialitePage() {
  return (
    <main>
      <Navbar />

      <article className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Politique de confidentialité
          </h1>
          <p className="text-muted-foreground mb-12">
            Dernière mise à jour : 27 février 2026
          </p>

          {/* Introduction */}
          <section className="mb-10">
            <div className="text-muted-foreground space-y-3 leading-relaxed">
              <p>
                The Webmaster accorde une importance fondamentale à la protection
                de vos données personnelles. La présente politique de
                confidentialité décrit la manière dont nous collectons, utilisons
                et protégeons vos informations conformément au Règlement Général
                sur la Protection des Données (RGPD — Règlement UE 2016/679) et
                à la législation belge en vigueur.
              </p>
            </div>
          </section>

          {/* Responsable du traitement */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">
              1. Responsable du traitement
            </h2>
            <div className="text-muted-foreground space-y-1 leading-relaxed">
              <p>Le responsable du traitement des données est :</p>
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

          {/* Données collectées */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">
              2. Données collectées
            </h2>
            <div className="text-muted-foreground space-y-3 leading-relaxed">
              <p>
                Dans le cadre de l&apos;utilisation de notre site, nous pouvons
                être amenés à collecter les catégories de données suivantes :
              </p>
              <h3 className="text-lg font-medium text-foreground mt-4">
                Données fournies directement par l&apos;utilisateur
              </h3>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Nom et prénom</li>
                <li>Adresse email</li>
                <li>Numéro de téléphone (facultatif)</li>
                <li>Message ou demande formulée via le formulaire de contact</li>
              </ul>
              <h3 className="text-lg font-medium text-foreground mt-4">
                Données collectées automatiquement
              </h3>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Adresse IP</li>
                <li>Type de navigateur et système d&apos;exploitation</li>
                <li>Pages visitées et durée de la visite</li>
                <li>Données de cookies (voir section 8)</li>
              </ul>
            </div>
          </section>

          {/* Finalités du traitement */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">
              3. Finalités du traitement
            </h2>
            <div className="text-muted-foreground space-y-3 leading-relaxed">
              <p>Vos données personnelles sont traitées aux fins suivantes :</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>
                  Répondre à vos demandes de contact et de devis
                </li>
                <li>
                  Assurer la gestion de la relation client
                </li>
                <li>
                  Améliorer notre site web et nos services
                </li>
                <li>
                  Respecter nos obligations légales et réglementaires
                </li>
                <li>
                  Réaliser des analyses statistiques anonymes sur
                  l&apos;utilisation du site
                </li>
              </ul>
            </div>
          </section>

          {/* Base légale */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">
              4. Base légale du traitement
            </h2>
            <div className="text-muted-foreground space-y-3 leading-relaxed">
              <p>
                Le traitement de vos données repose sur les bases légales
                suivantes :
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>
                  <strong className="text-foreground">Consentement :</strong>{" "}
                  lorsque vous remplissez notre formulaire de contact ou
                  acceptez l&apos;utilisation de cookies non essentiels.
                </li>
                <li>
                  <strong className="text-foreground">
                    Intérêt légitime :
                  </strong>{" "}
                  pour l&apos;amélioration de nos services et la réalisation de
                  statistiques de fréquentation du site.
                </li>
                <li>
                  <strong className="text-foreground">
                    Exécution contractuelle :
                  </strong>{" "}
                  lorsque le traitement est nécessaire à l&apos;exécution
                  d&apos;un contrat auquel vous êtes partie.
                </li>
                <li>
                  <strong className="text-foreground">
                    Obligation légale :
                  </strong>{" "}
                  pour répondre à nos obligations fiscales et comptables.
                </li>
              </ul>
            </div>
          </section>

          {/* Durée de conservation */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">
              5. Durée de conservation
            </h2>
            <div className="text-muted-foreground space-y-3 leading-relaxed">
              <p>
                Vos données personnelles sont conservées pour la durée
                strictement nécessaire aux finalités pour lesquelles elles ont
                été collectées :
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>
                  <strong className="text-foreground">
                    Données de contact :
                  </strong>{" "}
                  3 ans à compter du dernier contact
                </li>
                <li>
                  <strong className="text-foreground">
                    Données contractuelles :
                  </strong>{" "}
                  10 ans conformément aux obligations comptables belges
                </li>
                <li>
                  <strong className="text-foreground">
                    Données de navigation :
                  </strong>{" "}
                  13 mois maximum
                </li>
                <li>
                  <strong className="text-foreground">Cookies :</strong> 13
                  mois maximum
                </li>
              </ul>
            </div>
          </section>

          {/* Destinataires des données */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">
              6. Destinataires des données
            </h2>
            <div className="text-muted-foreground space-y-3 leading-relaxed">
              <p>
                Vos données personnelles peuvent être communiquées aux
                destinataires suivants :
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>
                  Les membres de l&apos;équipe The Webmaster dans le cadre de
                  leurs fonctions
                </li>
                <li>
                  Notre hébergeur Hostinger International Ltd. (données de navigation)
                </li>
                <li>
                  Les autorités compétentes, sur demande et dans le cadre des
                  obligations légales
                </li>
              </ul>
              <p>
                Nous ne vendons, ne louons et ne partageons pas vos données
                personnelles avec des tiers à des fins commerciales.
              </p>
            </div>
          </section>

          {/* Droits des utilisateurs */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">
              7. Vos droits
            </h2>
            <div className="text-muted-foreground space-y-3 leading-relaxed">
              <p>
                Conformément au RGPD, vous disposez des droits suivants
                concernant vos données personnelles :
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>
                  <strong className="text-foreground">Droit d&apos;accès :</strong>{" "}
                  obtenir la confirmation que vos données sont traitées et en
                  recevoir une copie.
                </li>
                <li>
                  <strong className="text-foreground">
                    Droit de rectification :
                  </strong>{" "}
                  demander la correction de données inexactes ou incomplètes.
                </li>
                <li>
                  <strong className="text-foreground">
                    Droit à l&apos;effacement :
                  </strong>{" "}
                  demander la suppression de vos données dans les cas prévus par
                  la loi.
                </li>
                <li>
                  <strong className="text-foreground">
                    Droit à la portabilité :
                  </strong>{" "}
                  recevoir vos données dans un format structuré, couramment
                  utilisé et lisible par machine.
                </li>
                <li>
                  <strong className="text-foreground">
                    Droit d&apos;opposition :
                  </strong>{" "}
                  vous opposer au traitement de vos données pour des motifs
                  légitimes.
                </li>
                <li>
                  <strong className="text-foreground">
                    Droit à la limitation du traitement :
                  </strong>{" "}
                  demander la suspension du traitement dans certaines
                  circonstances.
                </li>
                <li>
                  <strong className="text-foreground">
                    Droit de retrait du consentement :
                  </strong>{" "}
                  retirer votre consentement à tout moment, sans affecter la
                  licéité du traitement fondé sur le consentement effectué avant
                  ce retrait.
                </li>
              </ul>
              <p className="mt-4">
                Pour exercer ces droits, contactez-nous à{" "}
                <a
                  href="mailto:contact@thewebmaster.pro"
                  className="text-primary hover:underline"
                >
                  contact@thewebmaster.pro
                </a>
                . Nous nous engageons à répondre dans un délai de 30 jours.
              </p>
              <p>
                Vous avez également le droit d&apos;introduire une réclamation
                auprès de l&apos;
                <strong className="text-foreground">
                  Autorité de protection des données (APD)
                </strong>{" "}
                belge :{" "}
                <a
                  href="https://www.autoriteprotectiondonnees.be"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  www.autoriteprotectiondonnees.be
                </a>
              </p>
            </div>
          </section>

          {/* Cookies */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">
              8. Cookies et technologies similaires
            </h2>
            <div className="text-muted-foreground space-y-3 leading-relaxed">
              <p>
                Notre site peut utiliser des cookies pour assurer son bon
                fonctionnement et améliorer votre expérience de navigation.
              </p>
              <h3 className="text-lg font-medium text-foreground mt-4">
                Types de cookies utilisés
              </h3>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>
                  <strong className="text-foreground">
                    Cookies essentiels :
                  </strong>{" "}
                  nécessaires au fonctionnement du site, ils ne peuvent pas être
                  désactivés.
                </li>
                <li>
                  <strong className="text-foreground">
                    Cookies analytiques :
                  </strong>{" "}
                  nous permettent de mesurer l&apos;audience et d&apos;analyser
                  la fréquentation du site afin d&apos;en améliorer les
                  performances.
                </li>
              </ul>
              <h3 className="text-lg font-medium text-foreground mt-4">
                Gestion des cookies
              </h3>
              <p>
                Vous pouvez à tout moment modifier vos préférences en matière de
                cookies via les paramètres de votre navigateur. La désactivation
                de certains cookies peut affecter votre expérience de navigation
                sur le site.
              </p>
            </div>
          </section>

          {/* Sécurité */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">
              9. Sécurité des données
            </h2>
            <div className="text-muted-foreground space-y-3 leading-relaxed">
              <p>
                Nous mettons en oeuvre des mesures techniques et
                organisationnelles appropriées pour protéger vos données
                personnelles contre tout accès non autorisé, toute modification,
                divulgation ou destruction. Le site est sécurisé par un
                certificat SSL (HTTPS) garantissant le chiffrement des données
                échangées.
              </p>
            </div>
          </section>

          {/* Modifications */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">
              10. Modifications de la politique
            </h2>
            <div className="text-muted-foreground space-y-3 leading-relaxed">
              <p>
                The Webmaster se réserve le droit de modifier la présente
                politique de confidentialité à tout moment. Les modifications
                entreront en vigueur dès leur publication sur le site. Nous vous
                invitons à consulter régulièrement cette page pour rester
                informé des éventuelles mises à jour.
              </p>
            </div>
          </section>

          {/* Contact DPO */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">11. Contact</h2>
            <div className="text-muted-foreground space-y-3 leading-relaxed">
              <p>
                Pour toute question relative à la présente politique de
                confidentialité ou pour exercer vos droits, vous pouvez nous
                contacter :
              </p>
              <ul className="list-none space-y-1 mt-3">
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
                <li>
                  <strong className="text-foreground">Adresse :</strong>{" "}
                  Grimbergen, Belgique
                </li>
              </ul>
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
