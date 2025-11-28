set -x 
export TMPDIR='/tmp' 
export RUSTUP_INIT_SKIP_SPACE_CHECK=1 
export PATH="$CARGO_HOME/bin:$PATH"; sh temp_rust_installer_DO_NOT_RUN.sh -y --no-modify-path --profile minimal 
