# web-archive.txt

[![NPM version](https://img.shields.io/npm/v/@overbrowsing/web-archive.txt.svg)](https://www.npmjs.com/package/@overbrowsing/web-archive.txt)
[![npm downloads](https://img.shields.io/npm/dm/@overbrowsing/web-archive.txt.svg)](https://www.npmtrends.com/@overbrowsing/web-archive.txt)
[![License](https://img.shields.io/npm/l/@overbrowsing/web-archive.txt.svg)](https://tldrlegal.com/license/apache-license-2.0-(apache-2.0))

## Overview

*web-archive.txt* is an open specification for web archive interoperability, defining a human- and machine-readable plain-text descriptor published via the Well-Known URI pattern ([RFC8615](https://www.rfc-editor.org/info/rfc8615/)). It provides a consistent way for archives to publish identity, scope and access interfaces while enabling discovery and verification of programmatic endpoints.

## Why *web-archive.txt*?

The web archiving ecosystem is diverse and resilient but appears as a constellation of “[siloed nodes](http://www.dlib.org/dlib/november15/vandesompel/11vandesompel.html)”. Identity, scope, governance, and access are often opaque and rely on ad hoc knowledge. As systems evolve, downstream aggregators and web archive indexes degrade, concentrating visibility and use in a small number of major research archives. We developed *web-archive.txt* to address this by enabling each archive to publish a standard descriptor, preserving diversity while making differences explicit in a structured, human- and machine-readable format and supporting interoperability through comparable metadata.

## *web-archive.txt* Specification

> [!NOTE]
> **[→ *web-archive.txt* Specification v0.1⁠](/specification/v0.1/specification.md)**

*web-archive.txt* descriptors are written in [TOML](https://toml.io/), prioritising human readability while remaining fully machine-parseable. Native support for comments allows archives to include additional implementation context without affecting interoperability.

### Example *web-archive.txt*

The following is a complete example *web-archive.txt* descriptor for the [UK Government Web Archive (UKGWA)⁠](https://www.nationalarchives.gov.uk/webarchive/), located in the repository root ([available here](./web-archive.txt)):

```toml
version = "0.1"
last_updated = "2026-04-23"

[archive]
id = "ukgwa"
name =  [ "UK Government Web Archive", { alt = "UKGWA" } ]
established = "1996"
website = "https://www.nationalarchives.gov.uk/webarchive/"
email = "webarchive@nationalarchives.gov.uk"

[archive.organisation]
name = [ "The National Archives", { alt = "TNA" } ]
type = "national_archive"
location = [ "GB" ]
website = "https://www.nationalarchives.gov.uk/"

[archive.scope]
crawl = [ "selective", "event", "thematic" ]
authority = { type = "legal_deposit", documentation = "https://www.legislation.gov.uk/ukpga/Eliz2/6-7/51/contents" }
coverage = "1996-01-01/.."
domains = [ ".gov.uk" ] # All UK government departments and bodies creating records defined as Public Records under the British Public Act

[api]
documentation = "https://webarchive.nationalarchives.gov.uk/ukgwa/help/"
rate_limit = false # Contact us to request IP address whitelisting for high-volume access

[api.memento]
timemap = { endpoint = "https://webarchive.nationalarchives.gov.uk/ukgwa/timemap/json/{url}", access = "online" }
timegate = { endpoint = "https://webarchive.nationalarchives.gov.uk/ukgwa/{datetime}/{url}", access = "online" }

[api.cdx]
query = { endpoint = "https://webarchive.nationalarchives.gov.uk/ukgwa/cdx?url={url}", access = "online" }

[replay]
rewritten = "https://webarchive.nationalarchives.gov.uk/ukgwa/{datetime}/{url}"
no_toolbar = "https://webarchive.nationalarchives.gov.uk/ukgwa/nobanner/{datetime}/{url}"
raw = "https://webarchive.nationalarchives.gov.uk/ukgwa/{datetime}id_/{url}"
```

## Publishing a *web-archive.txt*

A conforming web archive **SHOULD** publish its descriptor in accordance with [RFC8615](https://www.rfc-editor.org/info/rfc8615/), Well-Known URIs.

```text
/.well-known/web-archive.txt
```

Archives **MAY** additionally advertise the descriptor using an HTTP `Link` header:

```http
Link: </.well-known/web-archive.txt>; rel="service-desc"
```

## *web-archive.txt* Validator

A reference validator is provided to verify conformance of a *web-archive.txt* descriptor with the specification schema. It validates TOML structure, applies versioned schema rules, reports errors with location information and can verify declared API endpoints.

### Installation

```bash
npm i @overbrowsing/web-archive.txt
```

### Usage 

Commands for validating:

1. Validate the example *web-archive.txt* descriptor for the [UK Government Web Archive (UKGWA)⁠](https://www.nationalarchives.gov.uk/webarchive/), located in the repository root ([available here](./web-archive.txt)):

   ```bash
   npx validate
   ```

2. Validate a target *web-archive.txt* using the latest schema version:

   ```bash
   npx validate path/to/web-archive.txt
   ```

3. Validate a target *web-archive.txt* against a specific version of the specification (e.g. v0.1)
  
   ```bash
   npx validate path/to/web-archive.txt --0.1
   ```

## Roadmap

We are currently developing a bootstrap registry of known web archives, starting with [IIPC members](https://netpreserve.org/about-us/members/). As web archives publish their own *web-archive.txt* descriptors, this registry will be progressively updated to reflect authoritative, source-published records.

## Credits

Developed by the [Overbrowsing Research Group](https://overbrowsing.com) at the [Institute for Design Informatics, The University of Edinburgh](https://designinformatics.org/).

## Citing

If you use, implement, or reference this specification, please cite it as '*web-archive.txt*' and include clear attribution in publications, software, or documentation where appropriate.

## Licenses

*web-archive.txt* is licensed under [Apache 2.0](https://tldrlegal.com/license/apache-license-2.0-(apache-2.0)). For full licensing details, see the [LICENSE](/LICENSE) file.