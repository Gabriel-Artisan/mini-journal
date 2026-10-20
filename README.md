# Mini Journal website

This repository hosts the public Mini Journal website at
https://gabriel-artisan.github.io/mini-journal/.

## Prepared v1.2.0 publication

The production-ready payload is in `site/`: HTML, bundled JavaScript/CSS,
service worker and a `release.json` version/source/checksum manifest.
The manifest identifies the approved source; it does not contain journal data.
Production JavaScript and CSS are publicly inspectable.

The Pages workflow uploads only `site/`, serving its contents at the existing
`/mini-journal/` URL. It does not rebuild source, install application dependencies,
or publish this repository's other files to the website.

Publication requires a human-authorized manual run of **Deploy approved static
website** on `main`, specifying the reviewed version and full source SHA.
Pushing a commit alone no longer deploys with this proposed workflow. A successful
Git push is not evidence of deployment; inspect the Pages job and verify HTTPS.
This preparation does not claim that v1.2.0 has been deployed.

## Historical material

Original Version 1 source files, specifications, tests and tooling remain available
in historical Git commits rather than the current working tree. Git history and
the `v1.0.0` tag are preserved; that history remains public. New development and
verification take place separately in the private
repository. Only reviewed static release assets and deployment documentation or
workflow changes should be added here.

## Data and updates

Keep the hostname, `/mini-journal/` path, service-worker scope and browser-storage
keys unchanged. Never clear users' site data to apply an update. Existing app tabs
keep their cached release until closed; the next complete worker can then activate.
Use disposable data for deployment smoke tests. Reverting to a pre-v1.2 app after
users save v1.2 metadata may be incompatible; prefer a compatible artifact or a
focused forward fix. Release tags and GitHub Releases require separate approval.
