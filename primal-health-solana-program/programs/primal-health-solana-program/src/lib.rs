use anchor_lang::prelude::*;

declare_id!("2LjMTbA2Z3ZftCr8UCJ3c5cauBq48NRBbXbiy6Zkkhao");

#[program]
pub mod primal_health_solana_program {
    use super::*;

    pub fn initialize_patient(ctx: Context<InitializePatient>, did: String) -> Result<()> {
        let patient_account = &mut ctx.accounts.patient_account;
        patient_account.authority = ctx.accounts.authority.key();
        patient_account.did = did;
        Ok(())
    }

    pub fn initialize_provider(ctx: Context<InitializeProvider>, did: String, name: String) -> Result<()> {
        let provider_account = &mut ctx.accounts.provider_account;
        provider_account.authority = ctx.accounts.authority.key();
        provider_account.did = did;
        provider_account.name = name;
        Ok(())
    }

    pub fn submit_health_data(
        ctx: Context<SubmitHealthData>,
        data_hash: String,
        encrypted_data: String,
    ) -> Result<()> {
        let health_data_account = &mut ctx.accounts.health_data_account;
        health_data_account.owner = ctx.accounts.owner.key();
        health_data_account.data_hash = data_hash;
        health_data_account.encrypted_data = encrypted_data;
        health_data_account.timestamp = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn create_claim(
        ctx: Context<CreateClaim>,
        claim_id: String,
        amount: u64,
        health_data_hash: String,
    ) -> Result<()> {
        let claim_account = &mut ctx.accounts.claim_account;
        claim_account.claim_id = claim_id;
        claim_account.patient = ctx.accounts.patient.key();
        claim_account.provider = ctx.accounts.provider.key();
        claim_account.health_data_hash = health_data_hash;
        claim_account.amount = amount;
        claim_account.status = ClaimStatus::Pending;
        claim_account.timestamp = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn verify_claim(ctx: Context<VerifyClaim>, status: ClaimStatus) -> Result<()> {
        let claim_account = &mut ctx.accounts.claim_account;
        
        // Only the assigned provider can verify
        require!(
            claim_account.provider == ctx.accounts.provider.key(),
            ErrorCode::Unauthorized
        );

        claim_account.status = status;
        Ok(())
    }

    pub fn process_payment(ctx: Context<ProcessPayment>) -> Result<()> {
        let claim_account = &mut ctx.accounts.claim_account;
        let provider = &mut ctx.accounts.provider;
        let patient = &mut ctx.accounts.patient;
        let system_program = &ctx.accounts.system_program;

        // Checks
        require!(
            claim_account.provider == provider.key(),
            ErrorCode::Unauthorized
        );
        require!(
            claim_account.patient == patient.key(),
            ErrorCode::InvalidPatient
        );
        require!(
            claim_account.status == ClaimStatus::Verified,
            ErrorCode::ClaimNotVerified
        );

        // Transfer SOL from provider to patient
        let amount = claim_account.amount;
        
        let cpi_context = CpiContext::new(
            system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: provider.to_account_info(),
                to: patient.to_account_info(),
            },
        );
        
        anchor_lang::system_program::transfer(cpi_context, amount)?;

        // Update claim status
        claim_account.status = ClaimStatus::Paid;
        
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(did: String)]
pub struct InitializePatient<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 4 + did.len() + 64,
        seeds = [b"patient", authority.key().as_ref()],
        bump
    )]
    pub patient_account: Account<'info, PatientAccount>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(did: String, name: String)]
pub struct InitializeProvider<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 4 + did.len() + 4 + name.len() + 64,
        seeds = [b"provider", authority.key().as_ref()],
        bump
    )]
    pub provider_account: Account<'info, ProviderAccount>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(data_hash: String, encrypted_data: String)]
pub struct SubmitHealthData<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + 32 + 4 + data_hash.len() + 4 + encrypted_data.len() + 8 + 64,
        seeds = [b"health_data", data_hash.as_bytes()],
        bump
    )]
    pub health_data_account: Account<'info, HealthDataAccount>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(claim_id: String)]
pub struct CreateClaim<'info> {
    #[account(
        init,
        payer = patient,
        space = 8 + 4 + claim_id.len() + 32 + 32 + 4 + 64 + 8 + 1 + 1 + 8 + 64,
        seeds = [b"claim", claim_id.as_bytes()],
        bump
    )]
    pub claim_account: Account<'info, ClaimAccount>,
    #[account(mut)]
    pub patient: Signer<'info>,
    /// CHECK: The provider account is just a pubkey here for assignment
    pub provider: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct VerifyClaim<'info> {
    #[account(mut)]
    pub claim_account: Account<'info, ClaimAccount>,
    pub provider: Signer<'info>,
}

#[derive(Accounts)]
pub struct ProcessPayment<'info> {
    #[account(mut)]
    pub claim_account: Account<'info, ClaimAccount>,
    #[account(mut)]
    pub provider: Signer<'info>,
    /// CHECK: We are transferring funds to this account, verified by claim_account.patient
    #[account(mut)]
    pub patient: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct PatientAccount {
    pub authority: Pubkey,
    pub did: String,
}

#[account]
pub struct ProviderAccount {
    pub authority: Pubkey,
    pub did: String,
    pub name: String,
}

#[account]
pub struct HealthDataAccount {
    pub owner: Pubkey,
    pub data_hash: String,
    pub encrypted_data: String,
    pub timestamp: i64,
}

#[account]
pub struct ClaimAccount {
    pub claim_id: String,
    pub patient: Pubkey,
    pub provider: Pubkey,
    pub health_data_hash: String,
    pub amount: u64,
    pub status: ClaimStatus,
    pub timestamp: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum ClaimStatus {
    Pending,
    Verified,
    Paid,
    Rejected,
}

#[error_code]
pub enum ErrorCode {
    #[msg("You are not authorized to perform this action.")]
    Unauthorized,
    #[msg("The patient account does not match the claim.")]
    InvalidPatient,
    #[msg("The claim must be verified before payment.")]
    ClaimNotVerified,
}
