//! # browser
//!
//! A minimal browser engine built incrementally in Rust.
//!
//! The architecture follows the classic rendering pipeline (and Matt Brubeck's
//! "Let's build a browser engine" / robinson):
//!
//! ```text
//!   HTML  ──parse──▶  DOM tree
//!   CSS   ──parse──▶  Stylesheet
//!                       │
//!         DOM + CSS ──▶ Style tree (styled nodes)
//!                       │
//!                  Layout tree (boxes with geometry)
//!                       │
//!                  Display list ──paint──▶ pixels
//! ```
//!
//! Each module corresponds to one stage of the pipeline and is filled in over
//! successive development stages. For now they contain only scaffolding.

pub mod css;
pub mod dom;
pub mod font;
pub mod gui;
pub mod html;
pub mod layout;
pub mod net;
pub mod painting;
pub mod style;
