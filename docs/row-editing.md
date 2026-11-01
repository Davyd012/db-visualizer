# Row editing

The table query loads only selected columns. The edit form submits only selected,
editable columns so that unselected values are not overwritten. Row actions are
available only when all columns of the chosen unique key are selected.

Date and datetime values are read as MySQL strings to preserve their database
representation. The form uses `__DBV_NULL__` to represent SQL NULL; entering that
exact text writes NULL rather than a literal string.
