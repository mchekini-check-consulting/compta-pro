package com.comptapro.security;

import com.comptapro.model.Accountant;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

@RequiredArgsConstructor
@Getter
public class AccountantUserDetails implements UserDetails {

    private final Accountant accountant;

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_ACCOUNTANT"));
    }

    @Override
    public String getPassword() {
        return accountant.getPassword();
    }

    @Override
    public String getUsername() {
        return accountant.getEmail();
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }

    public Long getAccountantId() {
        return accountant.getId();
    }

    public String getCabinetName() {
        return accountant.getCabinetName();
    }
}
