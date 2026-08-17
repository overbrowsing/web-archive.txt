<div id="top"></div>

# *web-archive.txt* Specification v0.1

## Conformance

> [!IMPORTANT]
> The key words **"MUST"**, **"MUST NOT"**, **"REQUIRED"**, **"SHALL"**, **"SHALL NOT"**, **"SHOULD"**, **"SHOULD NOT"**, **"RECOMMENDED"**, **"MAY"**, and **"OPTIONAL"** in this document are to be interpreted as described in [RFC2119](https://rfc-editor.org/info/rfc2119/).
>
>   - Required properties (✓) **MUST** be present
>   - Optional properties (✕) **MAY** be omitted
>   - Unsupported or inapplicable properties **MUST** be omitted (null values are not permitted)
>   - URLs **MUST** be absolute, compliant, and include `http` or `https` scheme
>   - Comments are **OPTIONAL** for human interpretation

## Schema Overview

The *web-archive.txt* descriptor is declarative and the schema is organised into four sections:

   1. **[Version](#1-version)**: specification version metadata
   2. **[Archive](#2-archive)**: web archive identity, governance and collection scope metadata
   3. **[API](#3-api)**: supported programmatic access
   4. **[Replay](#4-replay)**: replay state modifier endpoints

## 1. Version

The following declares the specification version implemented by the descriptor and the last update timestamp. This enables consistent schema interpretation across implementations.

#### Schema:

| Property                                            | Parent         | Type         | Required | Description |
|-----------------------------------------------------|----------------|--------------|----------|-------------|
| `version`                                           |                | String       | ✓        | Specification version identifier (schema version, not deployment version) |
| `last_updated`                                      |                | Local Date   | ✓        | The date the *web-archive.txt* file was last updated, in [RFC9557](https://rfc-editor.org/info/rfc9557) full-date format (`YYYY-MM-DD`) |

#### Example:

```toml
# 'version' declaration

version = "0.1"
last_updated = "2026-08-17"
```

<p align="right"><a href="#top">Back to top ↑</a></p>

## 2. Archive

The archive manifest defines the identity, governance, and collection scope of a web archive.

It consists of three components:

   1. **[`archive`](#21-archive)**: defines the web archive’s core identity and public-facing metadata  
   2. **[`archive.organisation`](#22-archiveorganisation)**: defines the organisation responsible for operating the web archive  
   3. **[`archive.scope`](#23-archivescope)**: defines what is collected, how it is collected, the authority under which it is collected, and any defined collections

### 2.1. `archive`

The following declares the primary identity of the web archive.

#### Schema:

| Property                                            | Parent         | Type         | Required | Description |
|-----------------------------------------------------|----------------|--------------|----------|-------------|
| `archive`                                           |                | Table        | ✓        |             |
| `↪⠀id`                                              | `archive`      | String       | ✓        | Stable machine-readable web archive identifier consisting of 2–6 lowercase alphanumeric characters |
| `↪⠀name`                                            | `archive`      | Inline Table | ✓        | Web archive naming inline table |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; `↪⠀en`               | `name`         | String       | ✕        | English-language web archive name |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; `↪⠀alt`              | `name`         | String       | ✕        | Alternative or abbreviated archive name |
| `↪⠀established`                                     | `archive`      | String       | ✕        | Web archive establishment year, in [RFC9557](https://rfc-editor.org/info/rfc9557) year format (`YYYY`) |
| `↪⠀website`                                         | `archive`      | String       | ✓        | Canonical public web archive website URL |
| `↪⠀email`                                           | `archive`      | String       | ✕        | Administrative or operational contact email address |

#### Examples:

```toml
# 'archive' declaration for the UK Government Web Archive (UKGWA) 

[archive]
id = "ukgwa"
name = [ "UK Government Web Archive", { alt = "UKGWA" } ]
established = "2003"
website = "https://nationalarchives.gov.uk/webarchive"
email = "webarchive@nationalarchives.gov.uk"
```

```toml
# 'archive' declaration for Nettarkivet (Norwegian Web Archive)

[archive]
id = "nwa"
name = [ "Nettarkivet", { en = "Norwegian Web Archive", alt = "Norsk Nettarkiv" } ]
established = "2001"
website = "https://nb.no/samlingen/nettarkivet"
email = "nettarkivet@nb.no"
```

### 2.2. `archive.organisation`

The following declares the institution responsible for operating or governing the web archive.

#### Schema:

| Property                                            | Parent         | Type         | Required | Description |
|-----------------------------------------------------|----------------|--------------|----------|-------------|
| `organisation`                                      | `archive`      | Table        | ✓        |             |
| `↪⠀name`                                            | `organisation` | Inline Table | ✓        | Organisation naming inline table |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; `↪⠀en`               | `name`         | String       | ✕        | English-language organisation name |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; `↪⠀alt`              | `name`         | String       | ✕        | Alternative or abbreviated organisation name |
| `↪⠀type`                                            | `organisation` | String       | ✓        | Institutional classification. Values **MAY** include: `national_archive`, `national_library`, `state_archive`, `state_library`, `university`, `research_institute`, `government`, `nonprofit`, `commercial`, `community` |
| `↪⠀location`                                        | `organisation` | Array        | ✕        | Jurisdiction identifiers using [ISO 3166-1](https://iso.org/standard/72482.html) or [ISO 3166-2](https://iso.org/standard/72483.html) codes. The property MAY contain multiple jurisdiction identifiers representing hierarchical or overlapping jurisdictions |
| `↪⠀website`                                         | `organisation` | String       | ✕        | Canonical organisation website URL |

#### Examples:

```toml
# 'archive.organisation' declaration for the UK Government Web Archive (UKGWA) 

[archive.organisation]
name = [ "The National Archives", { alt = "TNA" } ]
type = "national_archive"
location = [ "GB" ]
website = "https://nationalarchives.gov.uk"
```

```toml
# 'archive.organisation' declaration for Nettarkivet (Norwegian Web Archive)

[archive.organisation]
name = [ "Nasjonalbiblioteket", { en = "National Library of Norway" } ]
type = "national_library"
location = [ "NO" ]
website = "https://nb.no"
```

### 2.3. `archive.scope`

The following declares collection boundaries, crawl modalities, strategies and temporal coverage metadata.

#### Schema:

| Property                                            | Parent         | Type         | Required | Description |
|-----------------------------------------------------|----------------|--------------|----------|-------------|
| `scope`                                             | `archive`      | Table        | ✓        |             |
| `↪⠀crawl`                                           | `scope`        | Array        | ✓        | Crawl modalities (harvesting methods) used by the web archive. Values MAY include: `national_domain`, `regional_domain`, `bulk`, `selective`, `event`, `thematic`, `periodical` |
| `↪⠀authority`                                       | `scope`        | Inline Table | ✓        | Legal or institutional basis for web archive crawling |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; `↪⠀type`             | `authority`    | String       | ✓        | Authority model. Values **MAY** include: `legal_deposit`, `public_record`, `institutional`, `voluntary`, `research` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; `↪⠀documentation`    | `authority`    | String       | ✕        | Reference describing the collection authority |
| `↪⠀coverage`                                        | `scope`        | String       | ✕        | Temporal coverage interval, in [RFC9557](https://rfc-editor.org/info/rfc9557) date format (`YYYY-MM-DD`). Supports open-ended (`YYYY-MM-DD/..`) and bounded (`YYYY-MM-DD/YYYY-MM-DD`) intervals |
| `↪⠀domains`                                         | `scope`        | Array        | ✕        | Domain scope indicators including ccTLDs, gTLDs and geoTLDs |
| `↪⠀collections`                                     | `scope`        | Array        | ✕        | Enables collection-scoped resolution. When defined, API and replay URI templates MAY include the `{collection}` variable |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; `↪⠀id`               | `collections`  | String       | ✓        | Stable machine-readable collection identifier |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; `↪⠀name`             | `collections`  | String       | ✓        | Human-readable collection name |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; `↪⠀coverage`         | `collections`  | String       | ✕        | Collection-specific temporal coverage interval, in [RFC9557](https://rfc-editor.org/info/rfc9557) date format (`YYYY-MM-DD`). Supports open-ended (`YYYY-MM-DD/..`) and bounded (`YYYY-MM-DD/YYYY-MM-DD`) intervals |

#### Examples:

```toml
# 'archive.scope' declaration for the UK Government Web Archive (UKGWA) 

[archive.scope]
crawl = [ "selective", "event", "thematic" ]
authority = { type = "public_record", documentation = "https://legislation.gov.uk/ukpga/Eliz2/6-7/51/contents" } # Public Records Act 1958 (6 & 7 Eliz. 2 c. 51)
coverage = "1996-01-01/.." # Began capturing in 2003; backfilled coverage to 1996 by the Internet Archive
domains = [ ".gov.uk" ]

```

```toml
# 'archive.scope' declaration for the National Archives and Records Administration (NARA) Web Archive 

[archive.scope]
crawl = [ "selective", "event", "periodical" ] # Congressional harvests recur biennially at end of term; White House/Federal-agency harvests are one-off
authority = { type = "public_record", documentation = "https://archives.gov/records-mgmt/policy/web-records" } # Federal Records Act and Presidential Records Act (44 U.S.C.); Congressional harvest run separately by NARA's Center for Legislative Archives
coverage = "2004-01-20/.."
domains = [ ".gov", ".mil" ] # Congressional harvests cover .senate.gov/.house.gov; 2004 harvest covered general Federal agency sites
collections = [
  { id = "peth04", name = "Presidential Term (2004)" },
  { id = "congress109th", name = "109th Congress (2006)" },
  { id = "congress110th", name = "110th Congress (2008)" },
  { id = "congress111th", name = "111th Congress (2010)" },
  { id = "congress112th", name = "112th Congress (2012)" },
  { id = "congress113th", name = "113th Congress (2014)" },
  { id = "congress114th", name = "114th Congress (2016)" },
  { id = "congress115th", name = "115th Congress (2018)" },
  { id = "congress116th", name = "116th Congress (2020)" },
  { id = "congress117th", name = "117th Congress (2022)" },
  { id = "congress118th", name = "118th Congress (2024)" },
  { id = "peot24", name = "Biden White House (2025)" }
]
```

<p align="right"><a href="#top">Back to top ↑</a></p>

## 3. API

The `api` manifest declares programmatic interfaces exposed by a web archive. The API model is declarative. It describes supported interfaces and endpoint templates without prescribing implementation behaviour. The manifest consists of three component tables:

   - **[`api`](#31-api)**: API documentation and access metadata
   - **[`api.memento`](#32-apimemento)**: Memento Protocol interface declarations
   - **[`api.cdx`](#33-apicdx)**: CDX query interface declarations

### 3.1 `api`

The following declares information relating to API documentation, access conditions and rate limiting policies.

#### Schema:

| Property                                            | Parent         | Type         | Required | Description |
|-----------------------------------------------------|----------------|--------------|----------|-------------|
| `api`                                               |                | Table        | ✕        |             |
| `↪⠀documentation`                                   | `api`          | String       | ✕        | URL to API documentation or developer resources |
| `↪⠀rate_limit`                                      | `api`          | Boolean      | ✕        | Indicates whether rate limiting is enforced (`true`/`false`). Add comments for additional access restrictions or exceptions |

#### Example:

```toml
# 'api' declaration for Arquivo.pt

[api]
documentation = "https://github.com/arquivo/pwa-technologies/wiki/APIs"
rate_limit = true # 250 requests/60s (CDX API), 400 requests/60s (Memento API), per IP; exceeding the limit returns HTTP 429 and repeated breaches can permanently block the IP
```

```toml
# 'api' declaration for the UK Government Web Archive (UKGWA) 

[api]
rate_limit = false # IP address whitelisting can be requested for high-volume access
```

### 3.2. `api.memento`

The following declares support for Memento Protocol interfaces, including TimeMap (URI-T) and TimeGate (URI-G) endpoints.

#### Schema:

| Property                                            | Parent         | Type         | Required | Description |
|-----------------------------------------------------|----------------|--------------|----------|-------------|
| `memento`                                           | `api`          | Table        | ✕        |             |
| `↪⠀timemap`                                         | `memento`      | Inline Table | ✕        | TimeMap (URI-T) endpoint declaration |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; `↪⠀endpoint`         | `timemap`      | String       | ✓        | URI template describing the endpoint location |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; `↪⠀access`           | `timemap`      | String       | ✓        | Access condition indicator. Recognised values include: `online`, `offline`, `local` |
| `↪⠀timegate`                                        | `memento`      | Inline Table | ✕        | TimeGate (URI-G) endpoint declaration |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; `↪⠀endpoint`         | `timegate`     | String       | ✓        | URI template describing the endpoint location |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; `↪⠀access`           | `timegate`     | String       | ✓        | Access condition indicator. Recognised values include: `online`, `offline`, `local` |

> [!IMPORTANT]
> All endpoint declarations for the Memento Protocol ([RFC7089](https://rfc-editor.org/info/rfc7089)), including TimeGate URI-G (`api.memento.timegate.endpoint`) and TimeMap URI-T (`api.memento.timemap.endpoint`), **MUST** support the following placeholder variables:
> 
>   - `{url}`: target resource URI
>   - `{datetime}`: 14-digit memento-datetime (`YYYYMMDDHHMMSS`)
> 
> Endpoint templates **MAY** additionally support:
> 
>   - `{collection}`: collection identifier `archive.scope.collections.id`

#### Examples:

```toml
# 'api.memento' declaration for the UK Government Web Archive (UKGWA) 

[api.memento]
timemap = { endpoint = "https://webarchive.nationalarchives.gov.uk/ukgwa/timemap/json/{url}", access = "online" }
timegate = { endpoint = "https://webarchive.nationalarchives.gov.uk/ukgwa/{datetime}/{url}", access = "online" }
```

```toml
# 'api.memento' declaration for Nettarkivet 

[api.memento]
timemap = { endpoint = "https://nettarkivet.nb.no/search/timemap/json/{url}", access = "online" }
timegate = { endpoint = "https://nettarkivet.nb.no/search/{url}", access = "online" }
```

### 3.3. `api.cdx`

The following declares support for a CDX-based server API, including endpoint configuration and access conditions.

#### Schema:

| Property                                            | Parent         | Type         | Required | Description |
|-----------------------------------------------------|----------------|--------------|----------|-------------|
| `cdx`                                               | `api`          | Table        | ✕        |             |
| `↪⠀query`                                           | `cdx`          | Inline Table | ✓        | CDX query endpoint declaration |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; `↪⠀endpoint`         | `query`        | String       | ✓        | URI template describing the endpoint location |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; `↪⠀access`           | `query`        | String       | ✓        | Access condition indicator. Recognised values include: `online`, `offline`, `local` |

> [!IMPORTANT]
> The endpoint declaration for the CDX Server API (`api.cdx.query.endpoint`) **MUST** support the following placeholder variables:
> 
>   - `{url}`: target resource URI
>   - `{datetime}`: 14-digit memento-datetime (`YYYYMMDDHHMMSS`)
> 
> Endpoint templates **MAY** additionally support:
> 
>   - `{collection}`: collection identifier `archive.scope.collections.id`

#### Example:

```toml
# 'api.cdx' declaration for the UK Government Web Archive (UKGWA) 

[api.cdx]
query = { endpoint = "https://webarchive.nationalarchives.gov.uk/ukgwa/cdx?url={url}", access = "online" }
```

```toml
# 'api.cdx' declaration for Nettarkivet (Norwegian Web Archive)

[api.cdx]
query = { endpoint = "https://nettarkivet.nb.no/search/cdx?url={url}", access = "online" }
```

<p align="right"><a href="#top">Back to top ↑</a></p>

## 4. Replay

The following declares URI templates and state modifiers used to render archived web resources.

#### Schema:

| Property                                            | Parent         | Type         | Required | Description |
|-----------------------------------------------------|----------------|--------------|----------|-------------|
| `replay`                                            |                | Table        | ✕        |             |
| `↪⠀rewritten`                                       | `replay`       | String       | ✕        | Standard replay mode with web archive rewriting enabled |
| `↪⠀no_toolbar`                                      | `replay`       | String       | ✕        | Replay mode without toolbar or banner injection |
| `↪⠀raw`                                             | `replay`       | String       | ✕        | Replay mode exposing minimally rewritten archived content |

> [!IMPORTANT]
> The replay state modifier endpoints (`replay.rewritten`, `replay.no_toolbar`, `replay.raw`) **MUST** support the following placeholder variables:
> 
>   - `{url}`: target resource URI
>   - `{datetime}`: 14-digit memento-datetime (`YYYYMMDDHHMMSS`)
> 
> Endpoint templates **MAY** additionally support:
> 
>   - `{collection}`: collection identifier `archive.scope.collections.id`

#### Example:

```toml
# 'replay' declaration for the UK Government Web Archive (UKGWA) 

[replay]
rewritten = "https://webarchive.nationalarchives.gov.uk/ukgwa/{datetime}/{url}"
no_toolbar = "https://webarchive.nationalarchives.gov.uk/ukgwa/nobanner/{datetime}/{url}"
raw = "https://webarchive.nationalarchives.gov.uk/ukgwa/{datetime}id_/{url}"
```

```toml
# 'replay' declaration for the National Archives and Records Administration (NARA) Web Archive 

[replay]
rewritten = "https://webharvest.gov/{collection}/{datetime}/{url}"
no_toolbar = "https://webharvest.gov/{collection}/{datetime}if_/{url}"
raw = "https://webharvest.gov/{collection}/{datetime}id_/{url}"
```

<p align="right"><a href="#top">Back to top ↑</a></p>

## 5. Complete web-archive.txt Files

The following example illustrates a complete valid *web-archive.txt* manifest for the [UK Government Web Archive (UKGWA)⁠](https://nationalarchives.gov.uk/webarchive/):

```toml
# Complete web-archive.txt for the UK Government Web Archive (UKGWA)

version = "0.1"
last_updated = "2026-08-17"

[archive]
id = "ukgwa"
name = [ "UK Government Web Archive", { alt = "UKGWA" } ]
established = "2003"
website = "https://nationalarchives.gov.uk/webarchive"
email = "webarchive@nationalarchives.gov.uk"

[archive.organisation]
name = [ "The National Archives", { alt = "TNA" } ]
type = "national_archive"
location = [ "GB" ]
website = "https://nationalarchives.gov.uk"

[archive.scope]
crawl = [ "selective", "event", "thematic" ]
authority = { type = "public_record", documentation = "https://legislation.gov.uk/ukpga/Eliz2/6-7/51/contents" } # Public Records Act 1958 (6 & 7 Eliz. 2 c. 51)
coverage = "1996-01-01/.." # Began capturing in 2003; backfilled coverage to 1996 by the Internet Archive
domains = [ ".gov.uk" ]

[api]
rate_limit = false # IP address whitelisting can be requested for high-volume access

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

The following example illustrates a complete valid *web-archive.txt* manifest for [Nettarkivet](https://nb.no/samlingen/nettarkivet/):

```toml
# Complete web-archive.txt for Nettarkivet (Norwegian Web Archive)

version = "0.1"
last_updated = "2026-08-17"

[archive]
id = "nwa"
name = [ "Nettarkivet", { en = "Norwegian Web Archive", alt = "Norsk Nettarkiv" } ]
established = "2001"
website = "https://nb.no/samlingen/nettarkivet"
email = "nettarkivet@nb.no"

[archive.organisation]
name = [ "Nasjonalbiblioteket", { en = "National Library of Norway" } ]
type = "national_library"
location = [ "NO" ]
website = "https://nb.no"

[archive.scope]
crawl = [ "national_domain", "event" ]
authority = { type = "legal_deposit", documentation = "https://lovdata.no/dokument/NL/lov/1989-06-09-32" } # legal deposit extended to the web in 2016 (amendment LOV-2015-06-19-72, enabling full .no domain harvesting)
coverage = "2001-01-01/.." # full-domain harvests paused 2008-2016 pending legal basis, subdomain/event harvesting continued throughout
domains = [ ".no" ]

[api]
rate_limit = false

[api.memento]
timemap = { endpoint = "https://nettarkivet.nb.no/search/timemap/json/{url}", access = "online" }
timegate = { endpoint = "https://nettarkivet.nb.no/search/{url}", access = "online" }

[api.cdx]
query = { endpoint = "https://nettarkivet.nb.no/search/cdx?url={url}", access = "online" }

[replay]
rewritten = "https://nettarkivet.nb.no/search/{datetime}/{url}"
raw = "https://nettarkivet.nb.no/search/{datetime}id_/{url}"
```

<p align="right"><a href="#top">Back to top ↑</a></p>