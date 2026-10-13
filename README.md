# Xfactur 🧾🌍

> **Solution full-stack intelligente de facturation et comptabilité automatisée : extraction multimodale par IA, bi-référentiel PCG (France) & SYSCOHADA Révisé (Espace OHADA), états financiers normalisés, conformité fiscale multi-pays, réconciliation bancaire et analytics financiers.**

[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2-purple.svg)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8.svg)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore%20%26%20Auth-ffca28.svg)](https://firebase.google.com/)
[![Gemini](https://img.shields.io/badge/Google%20GenAI-Gemini%203.1-orange.svg)](https://ai.google.dev/)
[![SYSCOHADA](https://img.shields.io/badge/Standard-SYSCOHADA%20R%C3%A9vis%C3%A9%20%26%20PCG-10b981.svg)](https://www.ohada.org/)

---

## 📑 Table des Matières / Table of Contents

1. [Vue d'ensemble / Overview](#-vue-densemble--overview)
2. [Bi-Référentiel Comptable : PCG France & SYSCOHADA Révisé](#-bi-référentiel-comptable--pcg-france--syscohada-révisé)
3. [Fonctionnalités Clés / Key Features](#-fonctionnalités-clés--key-features)
   - [Tableau de Bord & Multi-Devises](#1-tableau-de-bord-financier--multi-devises-dashboard)
   - [Ingestion Universelle & OCR Multimodal](#2-ingestion-universelle-de-factures-ingestion)
   - [Contrôle de Conformité Légale (France & OHADA)](#4-contrôle-de-conformité-fiscale-multi-pays-conformite)
   - [Imputation Automatique PCG & SYSCOHADA](#6-imputation-comptable-ia-pcg--syscohada-allocation)
   - [États Financiers Réglementaires OHADA](#7-états-financiers-réglementaires-ohada-ohada)
   - [Passerelle de Concordance PCG ⇄ SYSCOHADA](#8-passerelle-de-concordance-pcg--syscohada)
   - [Fiches Fiscales des 17 Pays de l'Espace OHADA](#9-fiches-fiscales-des-17-pays-de-lespace-ohada)
   - [Rapprochement Bancaire & Journal](#10-rapprochement-bancaire-ia-reconciliation--journal)
   - [Assistant Conversationnel Expert](#13-assistant-virtuel--copilot-ia-chatassistant)
4. [Architecture Technique / Architecture](#-architecture-technique--architecture)
5. [Pipeline d'Intelligence Artificielle & Fallback](#-pipeline-dintelligence-artificielle)
6. [Structure du Projet / Project Structure](#-structure-du-projet--project-structure)
7. [Modèle de Données Firestore / Data Model](#-modèle-de-données-firestore--data-model)
8. [Endpoints de l'API Backend / API Endpoints](#-endpoints-de-lapi-backend--api-endpoints)
9. [Installation & Démarrage / Getting Started](#-installation--démarrage--getting-started)
10. [Variables d'Environnement / Environment Variables](#-variables-denvironnement--environment-variables)
11. [Règles de Sécurité & Droits d'Accès](#-règles-de-sécurité--droits-daccès)
12. [Guide de Dépannage / Troubleshooting & FAQ](#-guide-de-dépannage--troubleshooting--faq)
13. [Licence](#-licence)

---

## 🌟 Vue d'ensemble / Overview

**Xfactur** est une plateforme web full-stack conçue pour automatiser et sécuriser l'ensemble de la chaîne de traitement comptable des entreprises opérant sous le **droit comptable français (PCG)** et sous le **Système Comptable OHADA Révisé (SYSCOHADA)** applicable dans les 17 États membres de l'espace OHADA :

- 📷 **Numérisation et extraction multimodale** de factures papier et électroniques (PDF, PNG, JPEG, caméra) avec OCR haute précision.
- 🌍 **Support Bi-Référentiel natif** : Bascule en un clic entre le **PCG français** (€) et le **SYSCOHADA Révisé** (FCFA XOF / XAF, USD, CDF, GNF).
- ⚖️ **Contrôle de conformité fiscale contextuel** : Vérification du SIRET/SIREN et de la TVA intracommunautaire (France) ou du RCCM, NIF, IFU, NINEA, NIU et mentions de Facture Normalisée (OHADA).
- 🧮 **Imputation comptable automatisée par IA** :
  - **PCG** : Fournisseurs `401000`, charges `6xxxxx`, TVA déductible `445660`.
  - **SYSCOHADA** : Fournisseurs `401100`/`401200`, charges d'exploitation `605xxx`/`62xxxx`/`63xxxx`, TVA récupérable `445200`.
- 📊 **États financiers normalisés OHADA** : Bilan (Actif / Passif) et Compte de Résultat en cascade (EBE, Résultat d'Exploitation, RAO, HAO, Résultat Net) générés en temps réel à partir des écritures du journal.
- 🔄 **Passerelle de concordance comptable** : Moteur de transposition bidirectionnel PCG ⇄ SYSCOHADA avec indice de confiance.
- 🏦 **Réconciliation bancaire intelligente** : Rapprochement automatique des écritures comptables avec les relevés bancaires.
- 💬 **Assistant IA financier** : Copilote interactif bilingue expert en normes PCG et SYSCOHADA.

---

## 🌍 Bi-Référentiel Comptable : PCG France & SYSCOHADA Révisé

Xfactur intègre un sélecteur de référentiel global persistant (`AccountingContext`) accessible à tout moment depuis la barre de navigation supérieure, le menu mobile et les pages principales :

| Critère | Référentiel PCG (France) 🇫🇷 | Référentiel SYSCOHADA Révisé 🌍 |
| :--- | :--- | :--- |
| **Zone Géographique** | France métropolitaine & DROM | 17 Pays membres de l'OHADA (UEMOA, CEMAC, RDC, Guinée, Comores) |
| **Monnaie Principale** | Euro (`EUR` - €) | Franc CFA (`XOF` / `XAF`), `USD`, `CDF`, `GNF` |
| **Identifiants Légaux** | SIREN / SIRET, Numéro TVA FR | RCCM, IFU (Bénin/Burkina), NINEA (Sénégal), CC (Côte d'Ivoire), NIU (Cameroun/Congo), NIF |
| **Taux de TVA Usuels** | 20 %, 10 %, 5.5 %, 2.1 % | 18 % (UEMOA), 19.25 % (Cameroun), 16 % (RDC), 18.9 % (Congo), 10-19 % |
| **Compte Fournisseur** | `401000` (Fournisseurs) | `401100` (Achats de biens) / `401200` (Prestations de services) |
| **Compte TVA Récupérable**| `445660` (TVA déductible s/ autres biens & services) | `445200` (État, TVA récupérable sur achats et services) |
| **TVA Collectée** | `445710` (TVA collectée) | `445100` (État, TVA facturée sur ventes) |
| **Compte Banque** | `512000` / `512100` (Banque) | `521100` (Banques locales compte principal) |
| **Fournitures de bureau** | `606400` | `605400` (Fournitures de bureau non stockées) |
| **Télécommunications** | `626000` (Frais postaux & télécoms) | `628100` (Frais de téléphone et télécommunications) |
| **Logiciels & SaaS** | `613600` / `618100` / `651000` | `634300` (Abonnements logiciels SaaS et licences) |
| **Honoraires & Conseils** | `622600` (Honoraires) | `632200` (CAC) / `632400` (Avocats & consultants) |
| **Réceptions & Missions** | `625300` / `625100` | `637100` (Réceptions) / `638100` (Transports) / `638300` (Per diem) |

---

## ⚡ Fonctionnalités Clés / Key Features

### 1. Tableau de Bord Financier & Multi-Devises (`/`)
- Visualisation instantanée des KPI essentiels : Chiffre d'affaires, total des charges, factures en attente, taux de rapprochement bancaire.
- Affichage automatique dans la devise active (`FCFA`, `€`, `$`, `CDF`, `GNF`).
- Graphique d'évolution du flux de trésorerie (Cash-flow mensuel) alimenté par les données réelles.
- Bouton de génération de données de test (« Générer données de test ») prêt à l'emploi.

### 2. Ingestion Universelle de Factures (`/ingestion`)
- Téléversement par glisser-déposer de factures (PDF, PNG, JPEG) ou capture directe via caméra.
- Badge d'indication visuelle du référentiel actif (SYSCOHADA vs PCG) avec sélection rapide.
- Moteur d'extraction IA haute fidélité (API Vision + repli automatique Gemini 3.1 Pro / Flash).
- Barre de recherche instantanée par nom d'émetteur ou numéro de facture.
- Normalisation automatique des montants avec formatage monétaire adapté (`formatMoney`).

### 3. Gestion du Cycle de Vie des Factures (`/factures`)
- Suivi d'état unifié : `cree` ➔ `valide` ➔ `alloue` ➔ `rapproche` (avec flags `bloque` et `archive`).
- Éditeur modal dynamique permettant la modification unitaire des montants, numéros et fournisseurs.
- Synchronisation bidirectionnelle et intégrité référentielle Firestore.

### 4. Contrôle de Conformité Fiscale Multi-Pays (`/conformite`)
- **Mode France (PCG)** :
  - Validité SIRET/SIREN et numéro de TVA intracommunautaire.
  - Mentions obligatoires (pénalités de retard, indemnité forfaitaire de recouvrement de 40 €).
- **Mode OHADA (SYSCOHADA)** :
  - Présence et validité du RCCM (Registre du Commerce et du Crédit Mobilier).
  - Contrôle des identifiants fiscaux nationaux : IFU (Bénin, Burkina Faso), NINEA (Sénégal), Compte Contribuable (Côte d'Ivoire), NIU (Cameroun, Congo), Numéro Impôt (RDC), NIF.
  - Vérification des mentions de Facture Normalisée / certification fiscale (FNE en Côte d'Ivoire, e-MECeF au Bénin).
  - Contrôle de cohérence mathématique : `Montant HT + Somme(TVA) == Montant TTC`.
- Score de conformité sur 100 et liste d'alertes préventives détaillées.

### 5. Feuille de Calcul et Audit TVA (`/tva`)
- Tableur interactif (JSpreadsheet CE) pour l'examen des taux et bases de TVA.
- Support des taux de TVA français (20 %, 10 %, 5.5 %, 2.1 %) et africains (18 % UEMOA, 19.25 % Cameroun, 16 % RDC, 18.9 % Congo).
- Calcul dynamique du taux effectif et détection des écarts de calcul ou d'arrondi.
- Sauvegarde instantanée des corrections dans Firestore.

### 6. Imputation Comptable IA PCG & SYSCOHADA (`/allocation`)
- Sélecteur de référentiel en en-tête permettant de préconiser les écritures soit en PCG, soit en SYSCOHADA Révisé.
- Moteur d'imputation prédisant les comptes appropriés selon la nomenclature officielle des deux plans de comptes.
- Respect strict du principe de la partie double : **Total Débits == Total Crédits**.
- Ventilation automatique :
  - **Débit** : Compte de charges (`605xxx`/`62xxxx`/`63xxxx` en OHADA ou `6xxxxx` en PCG)
  - **Débit** : TVA récupérable (`445200` en OHADA ou `445660` en PCG)
  - **Crédit** : Compte Fournisseur (`401100`/`401200` en OHADA ou `401000` en PCG)
- Envoi direct au grand livre comptable.

### 7. États Financiers Réglementaires OHADA (`/ohada`)
Module complet de reporting financier conforme au Système Comptable OHADA Révisé :
- **Bilan SYSCOHADA (Système normalisé)** :
  - **Actif** :
    - Actif immobilisé (charges immobilisées, immobilisations incorporelles, corporelles, financières)
    - Actif circulant (stocks, créances clients 4111, autres créances)
    - Trésorerie-Actif (titres de placement, valeurs à encaisser, banques 521, caisse 571)
  - **Passif** :
    - Ressources stables (capitaux propres, dettes financières)
    - Passif circulant (dettes d'exploitation fournisseurs 4011/4012, dettes fiscales et sociales 4452/431)
    - Trésorerie-Passif (découverts bancaires)
  - Indicateur d'équilibre Actif = Passif et calcul des écarts en temps réel.
- **Compte de Résultat SYSCOHADA (en cascade)** :
  - Produits d'exploitation & Chiffre d'affaires
  - Charges d'exploitation & Valeur ajoutée
  - Excédent Brut d'Exploitation (EBE)
  - Résultat d'Exploitation (RE)
  - Résultat Financier (RF)
  - Résultat des Activités Ordinaires (RAO)
  - Résultat Hors Activités Ordinaires (HAO)
  - Résultat Net de l'exercice (Bénéfice ou Perte)
- Fonctions d'impression et d'export direct pour les clôtures d'exercice et assemblées générales.

### 8. Passerelle de Concordance PCG ⇄ SYSCOHADA
Outil interactif de transposition comptable intégré dans le module `/ohada` :
- Conversion bidirectionnelle : **PCG (France) ➔ SYSCOHADA** et **SYSCOHADA ➔ PCG**.
- Recherche temps réel parmi les milliers de comptes officiels des deux nomenclatures (`comptes_pcg.csv` et `comptes_ohada.csv`).
- Préconisation intelligente du compte cible avec libellé explicatif et indice de confiance (de 70 % à 98 %).
- Idéal pour les groupes franco-africains, filiales locales et experts-comptables gérant des dossiers mixtes.

### 9. Fiches Fiscales des 17 Pays de l'Espace OHADA
Répertoire fiscal et réglementaire interactif intégré :
- Couvre les 17 États membres : **Sénégal, Côte d'Ivoire, Cameroun, Bénin, Burkina Faso, Gabon, RDC, Mali, Togo, Niger, Congo, Tchad, Guinée, Centrafrique, Guinée Équatoriale, Guinée-Bissau, Comores**.
- Pour chaque pays :
  - Taux normal de TVA officiel (18 %, 19.25 %, 16 %, etc.) et particularités (CAC, précomptes).
  - Dénomination exacte de l'identifiant fiscal (NINEA, Compte Contribuable CC, NIU, IFU, Numéro Impôt, NIF, RCCM).
  - Zone monétaire d'appartenance (`UEMOA`, `CEMAC`, `AUTRE`).
  - Dispositifs de facturation certifiée (e-MECeF au Bénin, Facturation Normalisée FNE en Côte d'Ivoire, etc.).
- Bouton « Appliquer ce pays comme défaut » pour configurer instantanément l'organisation.

### 10. Rapprochement Bancaire IA (`/reconciliation`) & Journal (`/journal`)
- Import de relevés bancaires (CSV, texte brut délimité).
- Parsing et normalisation IA des opérations (dates, libellés nettoyés, montants signés).
- Algorithme de scoring de correspondance (0 à 100 %) associant chaque débit bancaire à son écriture comptable.
- Grand livre en partie double avec balance temps réel et export FEC / CSV.

### 11. Piste d'Audit Fiable & Contrôle des Risques (`/audit`)
- Détection des doublons de facturation, anomalies de montants et factures non conformes.
- Checklist d'audit interne interactive (mentions obligatoires, rapprochement, TVA).

### 12. Réseau Social d'Entraide Comptable (`/social`)
- Forums thématiques dédiés :
  - `#comptabilite-generale`
  - `#syscohada-ohada`
  - `#fiscalite-france`
  - `#audit-risques`
  - `#automatisation-finance`
- Publications, votes (upvote / downvote) et commentaires imbriqués en temps réel via Firestore.

### 13. Assistant Virtuel & Copilot IA (`ChatAssistant`)
- Widget conversationnel disponible sur l'ensemble de l'application.
- Contextualisé avec les factures et le référentiel actif de l'organisation.
- Bilingue en normes comptables : répond avec précision sur les écritures PCG comme sur les classes et comptes du SYSCOHADA Révisé.

---

## 🏗 Architecture Technique / Architecture

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (SPA)                                 │
│      React 19  •  Vite 6  •  Tailwind CSS v4  •  Lucide Icons  •  Recharts   │
│      JSpreadsheet CE  •  Framer Motion  •  React Router v7                  │
│      AccountingContext (Multi-Référentiel PCG & SYSCOHADA)                  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTP / REST & WebSockets (Dev)
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                           BACKEND (Node / Express)                          │
│      server.ts (Express 4 + Vite middleware en Dev)                         │
│      Multer (Upload mémoire) • Axios • @google/genai SDK                    │
│      Routes IA contextuelles avec paramètre { standard: 'PCG' | 'OHADA' }   │
└───────────────────┬──────────────────────────────────────┬──────────────────┘
                    │                                      │
                    ▼                                      ▼
┌──────────────────────────────────────┐  ┌───────────────────────────────────┐
│           PIPELINE IA                │  │         PERSISTENCE & AUTH        │
│ • Custom LLM (OpenAI-compatible)     │  │ • Firebase Firestore (NoSQL)     │
│ • Google Gemini (Vision & Flash/Pro) │  │ • Firebase Authentication         │
│ • Imputation PCG & SYSCOHADA Révisé  │  │ • Dictionnaires CSV :             │
│ • Matching bancaire probabiliste     │  │   - comptes_pcg.csv               │
│ • Assistance fiscale multi-pays      │  │   - comptes_ohada.csv             │
└──────────────────────────────────────┘  └───────────────────────────────────┘
```

---

## 🤖 Pipeline d'Intelligence Artificielle

Le backend propose une architecture robuste à double étage adaptée au bi-référentiel :

1. **Fournisseur Principal** : Appels configurables vers des endpoints d'inférence compatibles OpenAI (LM Studio, vLLM, Ollama, OpenAI, Groq, Mistral, etc.) spécifiés par variables d'environnement (`VISION_AI_*`, `ALLOCATION_AI_*`, `CONFORMITY_AI_*`, etc.).
2. **Fallback Résilient (Google GenAI)** : En cas d'indisponibilité ou d'erreur du fournisseur principal, les requêtes basculent automatiquement et de façon transparente vers l'API Google Gemini (`gemini-3.1-pro-preview` et `gemini-3-flash-preview`).
3. **Prompts Spécialisés SYSCOHADA & PCG** :
   - L'imputation comptable adapte son prompt d'expertise selon la valeur du paramètre `standard` : expert ONECCA de l'espace OHADA pour SYSCOHADA, ou expert-comptable diplômé français pour le PCG.
   - Le contrôle de conformité adapte ses critères légaux (Code Général des Impôts français vs Acte Uniforme OHADA et législations des 17 pays membres).

---

## 📂 Structure du Projet / Project Structure

```text
.
├── .env.example                # Modèle des variables d'environnement (LLMs, API Keys)
├── firebase-applet-config.json # Configuration client Firebase
├── firebase-blueprint.json     # Schémas des collections et contraintes
├── firestore.rules             # Règles de sécurité Firestore sécurisées par rôle
├── index.html                  # Point d'entrée HTML
├── metadata.json               # Métadonnées et permissions AI Studio
├── package.json                # Dépendances et scripts npm
├── server.ts                   # Serveur Express full-stack avec Vite middleware
├── tsconfig.json               # Configuration TypeScript
├── vite.config.ts              # Configuration du bundler Vite
│
├── data/                       # Dictionnaires officiels des plans comptables
│   ├── comptes_pcg.csv         # Nomenclature du Plan Comptable Général français
│   └── comptes_ohada.csv       # Nomenclature du Système Comptable OHADA Révisé
│
└── src/
    ├── AccountingContext.tsx   # Contexte global bi-référentiel (PCG/OHADA, devise, pays)
    ├── App.tsx                 # Routage principal & gestionnaire d'authentification
    ├── AuthContext.tsx         # Contexte d'authentification Firebase (Google OAuth)
    ├── firebase.ts             # Initialisation du SDK Firebase Client
    ├── index.css               # Styles globaux avec Tailwind CSS v4
    ├── main.tsx                # Montée du composant racine React
    ├── seed.ts                 # Générateur de données de démonstration multi-devises
    ├── types.ts                # Définitions TypeScript (PCG, OHADA, Facture, Journal...)
    │
    ├── components/
    │   ├── ChatAssistant.tsx       # Assistant conversationnel IA (PCG & SYSCOHADA)
    │   ├── InvoiceEditorModal.tsx  # Modale d'édition manuelle de facture
    │   ├── Layout.tsx              # Barre de navigation avec sélecteur de référentiel
    │   ├── MarkdownEditorModal.tsx # Éditeur de documentation / notes
    │   └── Spreadsheet.tsx         # Wrapper React pour tableur JSpreadsheet
    │
    ├── lib/
    │   └── utils.ts                # Utilitaires de classes conditionnelles (clsx/twMerge)
    │
    ├── pages/
    │   ├── Admin.tsx               # Configuration organisation, référentiel & devise
    │   ├── Allocation.tsx          # Imputation comptable aux comptes PCG ou SYSCOHADA
    │   ├── Analytics.tsx           # Graphiques et métriques financières multi-devises
    │   ├── Audit.tsx               # Contrôle interne et détection d'anomalies
    │   ├── Conformite.tsx          # Contrôle juridique (CGI France ou Acte Uniforme OHADA)
    │   ├── Dashboard.tsx           # Tableau de bord principal avec KPIs monétaires
    │   ├── Factures.tsx            # Gestionnaire de factures et statuts
    │   ├── Ingestion.tsx           # Téléversement OCR, recherche et extraction IA
    │   ├── Journal.tsx             # Grand livre comptable & export FEC / CSV
    │   ├── OHADAStatements.tsx     # Bilan & Résultat OHADA, Concordance PCG-OHADA, 17 pays
    │   ├── Reconciliation.tsx      # Rapprochement bancaire assisté par IA
    │   ├── Social.tsx              # Communauté d'échange comptable & forums
    │   └── TVA.tsx                 # Audit des taux de TVA et recalcul tableur
    │
    └── services/
        ├── accountingService.ts    # Dictionnaire, concordance PCG ⇄ OHADA et devises
        ├── aiService.ts            # Client HTTP pour les routes IA du backend
        └── pcgService.ts           # Service historique pour la nomenclature PCG
```

---

## 🗄 Modèle de Données Firestore / Data Model

| Collection | Description | Champs Principaux |
| :--- | :--- | :--- |
| `organisations` | Entreprise utilisatrice | `nom`, `siret` / `identifiant_legal`, `email_admin`, `referentiel` (`'PCG'` \| `'OHADA'`), `devise` (`'EUR'`, `'XOF'`, `'XAF'`, etc.), `pays`, `regime_tva`, `statut` |
| `entreprises` | Tiers (clients / fournisseurs) | `nom`, `siret`, `tva_intracom`, `pays`, `adresse` |
| `factures` | Factures d'achats / ventes | `numero_facture`, `date_emission`, `montant_ht_eur`, `montant_ttc_eur`, `statut`, `score_qualite`, `est_conforme`, `author_uid` |
| `journal` | Écritures en partie double | `organisation_id`, `facture_id`, `date_ecriture`, `compte_id` (compte PCG ou SYSCOHADA), `debit`, `credit`, `piece`, `statut` |
| `lignes_releve`| Mouvements bancaires | `organisation_id`, `date_operation`, `libelle`, `montant`, `statut`, `piece_comptable` |
| `subreddits` | Canaux du forum social | `nom`, `description`, `createur_id` |
| `posts` | Publications communautaires | `subreddit`, `titre`, `contenu`, `votes`, `comments`, `auteurId` |
| `comments` | Commentaires de discussion | `postId`, `contenu`, `auteur`, `auteurId`, `createdAt` |

---

## 🔌 Endpoints de l'API Backend / API Endpoints

Tous les endpoints préfixés par `/api/` sont hébergés par le serveur Express (`server.ts`) :

### 1. Extraction Multimodale
- **Route** : `POST /api/ai/extract`
- **Payload** : `multipart/form-data` avec champ `files` (images ou documents scannés).
- **Réponse** : Données normalisées en JSON (numéro de facture, date, montants HT/TTC, lignes détaillées).

### 2. Contrôle de Conformité Multi-Pays
- **Route** : `POST /api/ai/conformity`
- **Payload** : `{ invoiceData: object, rules?: string, standard?: 'PCG' | 'OHADA', country?: string }`
- **Réponse** : `{ est_conforme: boolean, score_qualite: number, alertes: string[] }`
- **Comportement** : Valide selon le Code Général des Impôts (France) ou selon l'Acte Uniforme OHADA et la fiscalité du pays sélectionné (Sénégal, Côte d'Ivoire, Cameroun, etc.).

### 3. Allocation Comptable PCG & SYSCOHADA
- **Route** : `POST /api/ai/allocate`
- **Payload** : `{ invoiceData: object, rules?: string, standard?: 'PCG' | 'OHADA', currency?: string }`
- **Réponse** : `{ entries: [{ compte_id: string, libelle_compte: string, debit: number, credit: number, piece: string }] }`
- **Comportement** : Si `standard: 'OHADA'`, utilise la nomenclature SYSCOHADA Révisé (`401100`/`401200`, `445200`, `605xxx`, `62xxxx`, `63xxxx`) ; si `standard: 'PCG'`, utilise la nomenclature PCG (`401000`, `445660`, `6xxxxx`).

### 4. Parsing de Relevé Bancaire
- **Route** : `POST /api/ai/extract-bank`
- **Payload** : `{ csvText: string }`
- **Réponse** : `{ transactions: [{ date: string, libelle: string, montant: number }] }`

### 5. Rapprochement Bancaire
- **Route** : `POST /api/ai/reconcile`
- **Payload** : `{ journalEntries: object[], bankStatements: object[], rules?: string }`
- **Réponse** : `{ matches: [{ journal_id: string, releve_id: string, piece_comptable: string, score: number }] }`

### 6. Assistant Conversationnel Bilingue
- **Route** : `POST /api/ai/chat`
- **Payload** : `{ message: string, context: object }`
- **Réponse** : `{ reply: string }`
- **Comportement** : Répond aux questions comptables et financières en mobilisant l'expertise PCG et SYSCOHADA Révisé.

---

## 🚀 Installation & Démarrage / Getting Started

### Prérequis
- **Node.js** version 20 ou supérieure.
- **npm** ou **bun** installé.
- Clé d'API Gemini (fournie automatiquement dans AI Studio via `CUSTOM_GEMINI_API_KEY` ou `API_KEY`).

### 1. Clonage et installation des dépendances
```bash
git clone <url-du-depot>
cd xfactur
npm install
```

### 2. Configuration des variables d'environnement
Copiez le fichier `.env.example` vers `.env` et adaptez les variables selon vos besoins :
```bash
cp .env.example .env
```

### 3. Lancement en mode développement
Le serveur Express démarre et encapsule Vite pour servir l'application avec rechargement rapide :
```bash
npm run dev
```
L'application est accessible à l'adresse : **`http://localhost:3000`**

### 4. Compilation pour la production
```bash
npm run build
npm run start
```

### 5. Vérification du typage TypeScript
```bash
npm run lint
```

---

## 🔑 Variables d'Environnement / Environment Variables

Consultez `.env.example` pour la liste complète. Les variables principales sont :

```env
# Clé Gemini pour le pipeline par défaut et de repli
API_KEY=votre_cle_gemini
CUSTOM_GEMINI_API_KEY=votre_cle_gemini_optionnelle

# Endpoints personnalisés optionnels (compatibles OpenAI)
VISION_AI_BASE_URL=https://api.openai.com/v1
VISION_AI_API_KEY=sk-...
VISION_AI_MODEL=gpt-4o

EXTRACTOR_AI_BASE_URL=
EXTRACTOR_AI_API_KEY=
EXTRACTOR_AI_MODEL=

CONFORMITY_AI_BASE_URL=
CONFORMITY_AI_API_KEY=
CONFORMITY_AI_MODEL=

ALLOCATION_AI_BASE_URL=
ALLOCATION_AI_API_KEY=
ALLOCATION_AI_MODEL=

RECONCILIATION_AI_BASE_URL=
RECONCILIATION_AI_API_KEY=
RECONCILIATION_AI_MODEL=
```

---

## 🔒 Règles de Sécurité & Droits d'Accès

Le fichier `firestore.rules` applique des restrictions strictes :
- **Authentification requise** pour toutes les opérations de lecture et d'écriture de données comptables.
- **Validation structurelle** des factures (format de date ISO, bornes de scores de 0 à 100, montants positifs obligatoires).
- **Rôles Administrateurs** prédéfinis pour la suppression et l'administration globale.
- **Règles sociales isolées** : validation des votes (incréments unitaires autorisés) et protection contre l'usurpation d'identité d'auteur.

---

## ❓ Guide de Dépannage / Troubleshooting & FAQ

### Q : Comment basculer mon organisation entre le PCG français et le SYSCOHADA ?
> Cliquez simplement sur le sélecteur situé en haut à droite de la barre de navigation (`SYSCOHADA` ou `PCG France`). Vous pouvez également ajuster la devise par défaut (`FCFA`, `EUR`, `USD`, `CDF`, `GNF`) et le pays d'immatriculation dans la page **Administration** (`/admin`) ou dans l'onglet pays du module **OHADA** (`/ohada`).

### Q : Où consulter le Bilan et le Compte de Résultat normalisés OHADA ?
> Accédez à l'onglet **États OHADA** dans le menu latéral (route `/ohada`). Vous y trouverez le **Bilan normalisé**, le **Compte de Résultat en cascade**, l'outil de **Concordance PCG ⇄ OHADA** et les fiches des **17 pays membres**.

### Q : Comment fonctionne la concordance entre un compte PCG et un compte SYSCOHADA ?
> Rendez-vous dans `/ohada`, onglet **Concordance**. Saisissez un numéro de compte ou un intitulé (ex: `626000` ou `606400` en PCG, ou `628100` / `605400` en OHADA) pour obtenir immédiatement le compte équivalent, la justification comptable et le degré de confiance.

### Q : « Je vois 0 partout au premier lancement » (Tableau de bord vide)
> **Cause** : Votre base de données Firestore est neuve et ne contient encore aucune facture.  
> **Solution** : 
> 1. Cliquez sur le bouton bleu **« Générer données de test »** directement sur le Dashboard pour créer instantanément des factures et des lignes bancaires de démonstration adaptées au référentiel sélectionné.
> 2. Ou rendez-vous dans l'onglet **Ingestion** pour importer vos propres fichiers de factures.

### Q : L'extraction Vision échoue avec une erreur 500
> **Cause** : Si aucun serveur Vision externe n'est configuré, le système utilise la clé Gemini. Assurez-vous que la variable `API_KEY` ou `CUSTOM_GEMINI_API_KEY` est valide.

### Q : Comment exporter les écritures pour mon expert-comptable ?
> Rendez-vous sur la page **Journal** (`/journal`), puis cliquez sur le bouton d'export pour générer un fichier compatible avec les logiciels comptables (format FEC standard ou CSV).

---

## 📜 Licence

Projet développé sous licence **Apache-2.0**.
Consultez les fichiers d'en-tête pour plus d'informations.
